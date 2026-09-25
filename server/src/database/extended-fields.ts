import { ServiceUnavailableException } from '@nestjs/common';
import { PoolClient } from 'pg';

// Column names come exclusively from service-owned maps, never from request keys.
// The caller supplies a transaction so a missing migration cannot leave a partial record.
export async function persistExtended(
  client: PoolClient,
  sql: string,
  params: any[],
  table: string,
  fields: Record<string, any>,
) {
  const entries = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );
  const identifiers = [table, ...entries.map(([column]) => column)];
  if (identifiers.some((value) => !/^[a-z_]+$/.test(value)))
    throw new Error('Invalid internal column mapping');
  if (entries.length) {
    try {
      await client.query(
        `SELECT ${entries.map(([column]) => column).join(', ')} FROM ${table} WHERE FALSE`,
      );
    } catch (e) {
      if (e.code === '42703')
        throw new ServiceUnavailableException(
          'This field requires the requirements-audit section of dbscripts/tables/alter_tables.sql to be applied by your DBA. No record was saved.',
        );
      throw e;
    }
  }
  const result = await client.query(sql, params);
  if (entries.length && result.rows[0]) {
    const id = result.rows[0].id;
    const extended = await client.query(
      `UPDATE ${table} SET ${entries.map(([column], i) => `${column}=$${i + 1}`).join(', ')} WHERE id=$${entries.length + 1} RETURNING ${entries.map(([column]) => column).join(', ')}`,
      [...entries.map(([, value]) => value), id],
    );
    Object.assign(result.rows[0], extended.rows[0]);
  }
  return result;
}
