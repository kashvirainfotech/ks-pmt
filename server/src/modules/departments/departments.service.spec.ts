import { DepartmentsService } from './departments.service';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '@nestjs/config';
import { PoolClient } from 'pg';

describe('DepartmentsService department head relationship', () => {
  let db: DatabaseService;
  let service: DepartmentsService;
  let query: jest.Mock;
  let release: jest.Mock;
  let head: string | null;
  const department = { id: 'department-1', dept_name: 'Engineering' };

  beforeEach(() => {
    head = null;
    query = jest.fn(async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO department_heads')) head = params![1];
      if (sql.includes('DELETE FROM department_heads')) head = null;
      if (sql.includes('SELECT user_id FROM department_heads')) {
        return { rowCount: head ? 1 : 0, rows: head ? [{ user_id: head }] : [] };
      }
      if (sql.includes('INSERT INTO departments') || sql.includes('UPDATE departments')) {
        return { rowCount: 1, rows: [department] };
      }
      return { rowCount: 0, rows: [] };
    });
    release = jest.fn();
    db = new DatabaseService({} as ConfigService);
    jest.spyOn(db, 'getClient').mockResolvedValue({ query, release } as unknown as PoolClient);
    jest.spyOn(db, 'query').mockResolvedValue({ rowCount: 0, rows: [] } as any);
    service = new DepartmentsService(db);
  });

  it.each([undefined, 'head-1'])('creates a department with head %s and returns the existing API field', async (hodUserId) => {
    const result = await service.create({ deptCode: 'ENG', deptName: 'Engineering', hodUserId }, 'actor-1');
    expect(result.hod_user_id).toBe(hodUserId ?? null);
    expect(query.mock.calls[0][0]).toBe('BEGIN');
    expect(query.mock.calls.at(-1)![0]).toBe('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back the department creation when the head assignment fails', async () => {
    const original = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO department_heads')) throw new Error('foreign key violation');
      return original(sql, params);
    });
    await expect(service.create({ deptCode: 'ENG', deptName: 'Engineering', hodUserId: 'missing-user' }, 'actor-1')).rejects.toThrow('foreign key violation');
    expect(query.mock.calls.at(-1)![0]).toBe('ROLLBACK');
    expect(query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it.each([
    [undefined, 'head-1'],
    ['head-2', 'head-2'],
    [null, null],
  ])('updates head %s while preserving the response contract', async (hodUserId, expected) => {
    head = 'head-1';
    jest.spyOn(service, 'findOne').mockResolvedValue({ ...department, hod_user_id: head, designations: [] });
    const result = await service.update(department.id, { hodUserId }, 'actor-2');
    expect(result.hod_user_id).toBe(expected);
    expect(query.mock.calls.at(-1)![0]).toBe('COMMIT');
    if (hodUserId === undefined) {
      expect(query.mock.calls.some(([sql]) => /INSERT INTO department_heads|DELETE FROM department_heads/.test(sql))).toBe(false);
    }
  });

  it('lists departments without excluding departments that have no head', async () => {
    jest.spyOn(db, 'query').mockResolvedValue({ rowCount: 1, rows: [{ ...department, hod_user_id: null }] } as any);
    expect(await service.findAll()).toEqual([{ ...department, hod_user_id: null }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN department_heads'), [false]);
  });
});
