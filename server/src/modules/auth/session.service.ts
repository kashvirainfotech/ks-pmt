import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { randomUUID, createHash } from 'crypto';

@Injectable()
export class SessionService {
  constructor(private readonly db: DatabaseService) {}
  async available() {
    return !!(
      await this.db.query(
        "SELECT to_regclass('public.user_sessions') AS relation",
      )
    ).rows[0].relation;
  }
  hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  async create(userId: string, devicePlatform: string) {
    if (!(await this.available())) return undefined;
    const id = randomUUID();
    await this.db.query(
      'INSERT INTO user_sessions (id,user_id,device_platform,created_by,updated_by) VALUES ($1,$2,$3,$2,$2)',
      [id, userId, devicePlatform],
    );
    return id;
  }
  async setRefresh(id: string, token: string, expiresAt: Date) {
    await this.db.query(
      'UPDATE user_sessions SET refresh_token_hash=$2, expires_at=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$1',
      [id, this.hash(token), expiresAt],
    );
  }
  async consumeRefresh(id: string, token: string) {
    const result = await this.db.query(
      'UPDATE user_sessions SET refresh_token_hash=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND refresh_token_hash=$2 AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP RETURNING id',
      [id, this.hash(token)],
    );
    if (!result.rowCount)
      throw new UnauthorizedException(
        'Session expired, revoked, or refresh token already used',
      );
  }
  async validate(id: string, userId: string) {
    const result = await this.db.query(
      'SELECT id FROM user_sessions WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP',
      [id, userId],
    );
    if (!result.rowCount)
      throw new UnauthorizedException('Session has expired or been revoked');
  }
  async list(userId: string, currentId?: string) {
    if (!(await this.available()))
      throw new ServiceUnavailableException(
        'Session management requires the user_sessions table in dbscripts/tables/tables.sql to be applied by your DBA.',
      );
    return (
      await this.db.query(
        'SELECT id,device_platform,created_at,updated_at,expires_at,(id=$2) AS is_current FROM user_sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP ORDER BY created_at DESC',
        [userId, currentId || null],
      )
    ).rows;
  }
  async revoke(userId: string, id: string) {
    await this.db.query(
      'UPDATE user_sessions SET revoked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,updated_by=$1 WHERE id=$2 AND user_id=$1',
      [userId, id],
    );
  }
}
