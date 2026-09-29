import { BadRequestException } from "@nestjs/common";
import { DependenciesService } from "./dependencies.service";
import { DatabaseService } from "../../database/database.service";

describe("DependenciesService (PLAN-002)", () => {
  let service: DependenciesService;
  let db: { query: jest.Mock };

  beforeEach(() => {
    db = {
      query: jest.fn(),
    };
    service = new DependenciesService(db as unknown as DatabaseService);
  });

  it("should reject self-dependencies", async () => {
    await expect(
      service.createDependency(
        {
          sourceTaskId: "11111111-1111-1111-1111-111111111111",
          targetTaskId: "11111111-1111-1111-1111-111111111111",
          linkType: "FINISH_TO_START",
        },
        "user-1",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("should reject cycle when creating directed scheduling dependency", async () => {
    const taskA = "11111111-1111-1111-1111-111111111111";
    const taskB = "22222222-2222-2222-2222-222222222222";

    // 1. tasks exist query
    db.query.mockResolvedValueOnce({
      rows: [
        { id: taskA, title: "Task A" },
        { id: taskB, title: "Task B" },
      ],
    });

    // 2. cycle check query -> returns a match (path already exists from B to A)
    db.query.mockResolvedValueOnce({
      rows: [{ "?column?": 1 }],
    });

    await expect(
      service.createDependency(
        {
          sourceTaskId: taskA,
          targetTaskId: taskB,
          linkType: "BLOCKS",
        },
        "user-1",
      ),
    ).rejects.toThrow(
      "Circular dependency detected: adding this relationship would create a directed cycle",
    );
  });

  it("should allow non-scheduling links without cycle validation", async () => {
    const taskA = "11111111-1111-1111-1111-111111111111";
    const taskB = "22222222-2222-2222-2222-222222222222";

    // tasks exist query
    db.query.mockResolvedValueOnce({
      rows: [
        { id: taskA, title: "Task A" },
        { id: taskB, title: "Task B" },
      ],
    });

    // insert query
    db.query.mockResolvedValueOnce({
      rows: [{ id: "dep-1", link_type: "RELATED_TO" }],
    });

    // findOne
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: "dep-1",
          source_task_id: taskA,
          target_task_id: taskB,
          link_type: "RELATED_TO",
        },
      ],
    });

    const result = await service.createDependency(
      {
        sourceTaskId: taskA,
        targetTaskId: taskB,
        linkType: "RELATED_TO",
      },
      "user-1",
    );

    expect(result.id).toBe("dep-1");
    expect(result.link_type).toBe("RELATED_TO");
  });

  it("should return incoming and outgoing links with correct inverse labels", async () => {
    const taskId = "11111111-1111-1111-1111-111111111111";

    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "dep-out-1",
            link_type: "BLOCKS",
            related_task_title: "Task B",
            display_label: "Blocks",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "dep-in-1",
            link_type: "BLOCKS",
            related_task_title: "Task C",
            display_label: "Blocked by",
          },
        ],
      });

    const res = await service.findByTaskId(taskId);
    expect(res.outgoing).toHaveLength(1);
    expect(res.incoming).toHaveLength(1);
    expect(res.outgoing[0].display_label).toBe("Blocks");
    expect(res.incoming[0].display_label).toBe("Blocked by");
  });
});
