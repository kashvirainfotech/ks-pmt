import { persistExtended } from './extended-fields';

describe('Optional schema fields', () => {
  it('does not issue an insert if the required column is missing', async () => {
    const client = { query: jest.fn().mockRejectedValue({ code: '42703' }) };
    await expect(
      persistExtended(client as any, 'INSERT INTO users...', [], 'users', {
        emergency_contact: 'Test contact',
      }),
    ).rejects.toThrow('No record was saved');
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0][0]).toMatch(/^SELECT/);
  });
  it('preserves a zero value and returns the saved field', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'test' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ implementation_fee: 0 }] }),
    };
    const result = await persistExtended(
      client as any,
      'INSERT INTO products...',
      [],
      'products',
      { implementation_fee: 0, tech_stack: undefined },
    );
    expect(result.rows[0].implementation_fee).toBe(0);
    expect(client.query.mock.calls[2][1]).toEqual([0, 'test']);
  });
});
