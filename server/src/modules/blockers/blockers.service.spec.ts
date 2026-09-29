import {
  BlockersService,
  calculateNonOverlappingBlockedMinutes,
} from "./blockers.service";
import { DatabaseService } from "../../database/database.service";

describe("BlockersService (PLAN-002)", () => {
  let service: BlockersService;
  let db: { query: jest.Mock };

  beforeEach(() => {
    db = {
      query: jest.fn(),
    };
    service = new BlockersService(db as unknown as DatabaseService);
  });

  describe("calculateNonOverlappingBlockedMinutes", () => {
    it("should compute exact minutes for a single interval", () => {
      const episodes = [
        {
          started_at: "2026-10-01T10:00:00Z",
          resolved_at: "2026-10-01T11:00:00Z", // 60 minutes
        },
      ];
      expect(calculateNonOverlappingBlockedMinutes(episodes)).toBe(60);
    });

    it("should sum disjoint intervals without double counting", () => {
      const episodes = [
        {
          started_at: "2026-10-01T10:00:00Z",
          resolved_at: "2026-10-01T11:00:00Z", // 60 min
        },
        {
          started_at: "2026-10-01T12:00:00Z",
          resolved_at: "2026-10-01T13:00:00Z", // 60 min
        },
      ];
      expect(calculateNonOverlappingBlockedMinutes(episodes)).toBe(120);
    });

    it("should merge completely overlapping intervals strictly once", () => {
      const episodes = [
        {
          started_at: "2026-10-01T10:00:00Z",
          resolved_at: "2026-10-01T12:00:00Z", // 120 min (10:00 - 12:00)
        },
        {
          started_at: "2026-10-01T10:30:00Z",
          resolved_at: "2026-10-01T11:30:00Z", // inner sub-interval
        },
      ];
      expect(calculateNonOverlappingBlockedMinutes(episodes)).toBe(120);
    });

    it("should merge partially overlapping intervals correctly", () => {
      const episodes = [
        {
          started_at: "2026-10-01T10:00:00Z",
          resolved_at: "2026-10-01T11:30:00Z", // 90 min (10:00 - 11:30)
        },
        {
          started_at: "2026-10-01T11:00:00Z",
          resolved_at: "2026-10-01T12:30:00Z", // 90 min (11:00 - 12:30)
        },
      ];
      // Merged interval: 10:00 to 12:30 = 150 minutes
      expect(calculateNonOverlappingBlockedMinutes(episodes)).toBe(150);
    });
  });

  describe("Task unblocking acceptance", () => {
    it("should NOT mark task unblocked if another active blocker remains", async () => {
      const taskId = "task-1";
      const episodeId = "ep-1";

      // 1. findOne
      db.query.mockResolvedValueOnce({
        rows: [{ id: episodeId, task_id: taskId, status: "ACTIVE" }],
      });

      // 2. update episode to RESOLVED
      db.query.mockResolvedValueOnce({
        rows: [{ id: episodeId, status: "RESOLVED" }],
      });

      // 3. recalculateTaskBlockedStatus: activeEpisodes query returns 1 remaining
      db.query.mockResolvedValueOnce({
        rows: [{ count: "1" }],
      });

      // 4. activePrereq query returns 0
      db.query.mockResolvedValueOnce({
        rows: [{ count: "0" }],
      });

      // 5. UPDATE tasks SET is_blocked = $1
      db.query.mockResolvedValueOnce({ rows: [] });

      // 6. findOne returning resolved episode
      db.query.mockResolvedValueOnce({
        rows: [{ id: episodeId, task_id: taskId, status: "RESOLVED" }],
      });

      await service.resolveBlocker(
        episodeId,
        { resolutionNotes: "Partial fix" },
        "user-1",
      );

      // Verify that tasks UPDATE was called with true (remains blocked)
      expect(db.query).toHaveBeenCalledWith(
        `UPDATE tasks SET is_blocked = $1 WHERE id = $2`,
        [true, taskId],
      );
    });

    it("should mark task unblocked when ALL active blockers and blocking links are resolved", async () => {
      const taskId = "task-1";
      const episodeId = "ep-1";

      // 1. findOne
      db.query.mockResolvedValueOnce({
        rows: [{ id: episodeId, task_id: taskId, status: "ACTIVE" }],
      });

      // 2. update episode to RESOLVED
      db.query.mockResolvedValueOnce({
        rows: [{ id: episodeId, status: "RESOLVED" }],
      });

      // 3. activeEpisodes query returns 0
      db.query.mockResolvedValueOnce({
        rows: [{ count: "0" }],
      });

      // 4. activePrereq query returns 0
      db.query.mockResolvedValueOnce({
        rows: [{ count: "0" }],
      });

      // 5. UPDATE tasks SET is_blocked = false
      db.query.mockResolvedValueOnce({ rows: [] });

      // 6. findOne returning resolved episode
      db.query.mockResolvedValueOnce({
        rows: [{ id: episodeId, task_id: taskId, status: "RESOLVED" }],
      });

      await service.resolveBlocker(
        episodeId,
        { resolutionNotes: "Issue solved" },
        "user-1",
      );

      expect(db.query).toHaveBeenCalledWith(
        `UPDATE tasks SET is_blocked = $1 WHERE id = $2`,
        [false, taskId],
      );
    });
  });
});
