import { SavedViewsService } from './saved-views.service';
import { DatabaseService } from '../../database/database.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('SavedViewsService', () => {
  let service: SavedViewsService;
  let mockDb: { query: jest.Mock };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    service = new SavedViewsService(mockDb as unknown as DatabaseService);
  });

  describe('getPresets', () => {
    it('should return built-in attention workspace presets for the user', () => {
      const presets = service.getPresets('user-123');
      expect(presets).toHaveLength(5);
      const names = presets.map((p) => p.viewName);
      expect(names).toContain('My Work');
      expect(names).toContain('Awaiting QA');
      expect(names).toContain('Awaiting Client');
      expect(names).toContain('Blocked');
      expect(names).toContain('Unassigned');

      const myWork = presets.find((p) => p.viewName === 'My Work');
      expect(myWork?.filters.assigneeUserId).toBe('user-123');
    });
  });

  describe('createView', () => {
    it('should insert a saved view and clear previous default if isDefault is true', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // UPDATE previous default
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'view-1',
              view_name: 'Sprint 1 Tasks',
              is_default: true,
              user_id: 'user-1',
            },
          ],
        });

      const res = await service.createView(
        {
          viewName: 'Sprint 1 Tasks',
          isDefault: true,
          filters: { sprintId: 'sp-1' },
        },
        'user-1',
      );

      expect(res.id).toBe('view-1');
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query.mock.calls[0][0]).toContain('UPDATE saved_views');
    });
  });

  describe('findOneView & permissions', () => {
    it('should throw NotFoundException if view does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.findOneView('unknown', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if viewing another user private view', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'view-private',
            view_name: 'Secret',
            scope: 'PERSONAL',
            user_id: 'other-user',
          },
        ],
      });

      await expect(
        service.findOneView('view-private', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow viewing shared TEAM or PROJECT view', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'view-team',
            view_name: 'Team View',
            scope: 'TEAM',
            user_id: 'other-user',
          },
        ],
      });

      const res = await service.findOneView('view-team', 'user-1');
      expect(res.id).toBe('view-team');
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'v-1',
              scope: 'PERSONAL',
              user_id: 'user-1',
              is_favorite: false,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'v-1', is_favorite: true }],
        });

      const res = await service.toggleFavorite('v-1', 'user-1');
      expect(res.is_favorite).toBe(true);
    });
  });
});
