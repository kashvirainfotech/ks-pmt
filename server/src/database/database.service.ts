import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { persistExtended } from './extended-fields';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const isSsl = this.configService.get<string>('DB_SSL') === 'true';

    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      user: this.configService.get<string>('DB_USER', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD', 'postgres'),
      database: this.configService.get<string>('DB_NAME', 'ks_pmt_db'),
      max: this.configService.get<number>('DB_POOL_MAX', 20),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: isSsl ? { rejectUnauthorized: false } : false,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err);
    });

    this.logger.log('PostgreSQL connection pool initialized');
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('PostgreSQL connection pool closed');
    }
  }

  /**
   * Execute a parameterized SQL query
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params: any[] = [],
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      this.logger.debug(
        `Executed query in ${duration}ms: ${text.substring(0, 80)}...`,
      );
      return res;
    } catch (error) {
      this.logger.error(
        `Database query error: ${error.message} | Query: ${text}`,
      );
      throw error;
    }
  }

  /**
   * Acquire a dedicated client for multi-statement transactions
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async writeWithFields(
    sql: string,
    params: any[],
    table: string,
    fields: Record<string, any>,
  ) {
    return this.transaction((client) =>
      persistExtended(client, sql, params, table, fields),
    );
  }

  /**
   * Execute work inside an isolated database transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Transaction failed and rolled back: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
