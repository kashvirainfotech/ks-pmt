import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';
describe('Project UUID validation', () => {
  const base = { projectCode: 'QA', projectName: 'QA project' };
  it('rejects malformed IDs rather than silently substituting another record', async () => {
    const errors = await validate(
      plainToInstance(CreateProjectDto, { ...base, clientId: 'wrong-client' }),
    );
    expect(errors.some((e) => e.property === 'clientId')).toBe(true);
  });
  it('accepts the administrator identifier used by existing seed data', async () => {
    expect(
      await validate(
        plainToInstance(CreateProjectDto, {
          ...base,
          projectManagerUserId: '00000000-0000-0000-0000-000000000001',
        }),
      ),
    ).toHaveLength(0);
  });
  it('omits an empty optional selector', async () => {
    const dto = plainToInstance(CreateProjectDto, { ...base, branchId: '' });
    expect(dto.branchId).toBeUndefined();
    expect(await validate(dto)).toHaveLength(0);
  });
});
