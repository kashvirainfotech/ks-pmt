import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { authorizeTaskFields } from "./tasks.controller";
import { validateDateRanges } from "../../common/validators/date-ranges";

describe("Task field editing", () => {
  let task: any;
  let client: any;
  let service: TasksService;
  let writes: Array<{ sql: string; values: any[] }>;
  beforeEach(() => {
    task = {
      id: "task",
      revision: 4,
      title: "Existing",
      task_type_id: "type",
      status_id: "todo",
      project_id: "project",
      product_id: null,
      branch_id: "branch",
      planned_start_date: "2026-10-10",
      planned_end_date: "2026-10-12",
    };
    writes = [];
    client = {
      query: jest.fn(async (sql: string, values: any[] = []) => {
        if (sql.includes("FOR UPDATE")) return { rows: [task] };
        if (sql.startsWith("SELECT u.id"))
          return {
            rows: values[0]
              .filter((id: string) => id !== "inactive")
              .map((id: string) => ({ id })),
          };
        if (sql.startsWith("SELECT project_id"))
          return { rows: [{ project_id: "other-project", product_id: null }] };
        if (sql.startsWith("SELECT id, custom_fields FROM task_types"))
          return { rows: [{ id: "type2" }] };
        if (sql.includes("task_type_workflow_statuses")) return { rows: [] };
        writes.push({ sql, values });
        return { rows: [{ ...task, revision: 5 }] };
      }),
    };
    service = new TasksService(
      { transaction: (fn: any) => fn(client) } as any,
      {} as any,
      {} as any,
    );
  });
  it("clears optional fields while retaining zero and false and omitting unchanged columns", async () => {
    await service.update(
      "task",
      {
        expectedRevision: 4,
        description: null,
        versionId: null,
        plannedStartDate: null,
        estimatedHours: 0,
        isChargeable: false,
      } as any,
      "actor",
    );
    const update = writes.find((w) => w.sql.startsWith("UPDATE tasks"))!;
    expect(update.sql).not.toContain("COALESCE");
    expect(update.sql).not.toContain("title=");
    expect(update.values).toEqual([
      "actor",
      "task",
      null,
      null,
      null,
      0,
      false,
    ]);
  });
  it("rejects stale writes before changing any fields or assignments", async () => {
    await expect(
      service.update(
        "task",
        { expectedRevision: 3, title: "Draft", assigneeIds: ["a"] },
        "actor",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(writes).toEqual([]);
  });
  it("rejects invalid dates against the locked current record", async () => {
    await expect(
      service.update("task", { plannedEndDate: "2026-10-01" }, "actor"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(writes).toEqual([]);
  });
  it("allows clearing a start date while moving the end earlier", async () => {
    await expect(
      service.update(
        "task",
        { plannedStartDate: null, plannedEndDate: "2026-10-01" } as any,
        "actor",
      ),
    ).resolves.toBeDefined();
    expect(() =>
      validateDateRanges(
        { plannedStartDate: null, plannedEndDate: "2026-10-01" },
        task,
        true,
      ),
    ).not.toThrow();
  });
  it("rejects null required fields and whitespace-only titles", async () => {
    await expect(
      service.update("task", { title: null } as any, "actor"),
    ).rejects.toThrow("cannot be cleared");
    await expect(
      service.update("task", { title: "   " }, "actor"),
    ).rejects.toThrow("Title is required");
    expect(writes).toEqual([]);
  });
  it("rejects releases owned by another project", async () => {
    await expect(
      service.update("task", { versionId: "wrong" }, "actor"),
    ).rejects.toThrow("Version must belong");
    expect(writes).toEqual([]);
  });
  it("rejects task type changes incompatible with the current workflow status", async () => {
    await expect(
      service.update("task", { taskTypeId: "type2" }, "actor"),
    ).rejects.toThrow("Current status");
  });
  it("rejects inactive or out-of-branch assignees before replacing assignments", async () => {
    await expect(
      service.assignUsers(
        "task",
        { assigneeIds: ["inactive"], expectedRevision: 4 },
        "actor",
      ),
    ).rejects.toThrow("active assignees");
    expect(writes).toEqual([]);
  });
  it("rejects stale assignment changes before deleting existing assignments", async () => {
    await expect(
      service.assignUsers(
        "task",
        { assigneeIds: [], expectedRevision: 2 },
        "actor",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(writes).toEqual([]);
  });
  it("allows clearing all assignees and updates the task revision through its trigger", async () => {
    await service.assignUsers(
      "task",
      { assigneeIds: [], expectedRevision: 4 },
      "actor",
    );
    expect(
      writes.some((w) => w.sql.startsWith("DELETE FROM task_assignees")),
    ).toBe(true);
    expect(writes.some((w) => w.sql.startsWith("UPDATE tasks"))).toBe(true);
  });
  it("keeps a combined field and assignment update in one transaction", async () => {
    await service.update(
      "task",
      {
        title: "New",
        assigneeIds: ["a"],
        primaryAssigneeId: "a",
        expectedRevision: 4,
      },
      "actor",
    );
    expect(
      client.query.mock.calls.filter(([sql]: any) =>
        sql.includes("FOR UPDATE"),
      ),
    ).toHaveLength(1);
    expect(
      writes.some((w) => w.sql.startsWith("INSERT INTO task_assignees")),
    ).toBe(true);
    expect(writes.at(-1)?.sql).toContain("UPDATE tasks");
  });
  it("rejects scope changes instead of silently ignoring them", async () => {
    await expect(
      service.update("task", { projectId: "different" }, "actor"),
    ).rejects.toThrow("scope cannot be changed");
  });
});

describe("Task field permissions", () => {
  const access = {
    roleCode: "ROLE_DEVELOPER",
    permissions: new Set(["TASKS:UPDATE"]),
  };
  it("permits ordinary task fields", () =>
    expect(() => authorizeTaskFields({ title: "New" }, access)).not.toThrow());
  it("requires assignment permission even through a generic update", () =>
    expect(() => authorizeTaskFields({ assigneeIds: [] }, access)).toThrow(
      ForbiddenException,
    ));
  it("requires financial permission for zero amounts and false flags", () => {
    expect(() => authorizeTaskFields({ chargeAmount: 0 }, access)).toThrow(
      ForbiddenException,
    );
    expect(() => authorizeTaskFields({ isChargeable: false }, access)).toThrow(
      ForbiddenException,
    );
  });
  it("allows specialized permissions and super admin", () => {
    expect(() =>
      authorizeTaskFields(
        { assigneeIds: [] },
        { ...access, permissions: new Set(["TASKS:ASSIGN"]) },
      ),
    ).not.toThrow();
    expect(() =>
      authorizeTaskFields(
        { chargeAmount: 0 },
        { roleCode: "ROLE_SUPER_ADMIN" },
      ),
    ).not.toThrow();
  });
});
