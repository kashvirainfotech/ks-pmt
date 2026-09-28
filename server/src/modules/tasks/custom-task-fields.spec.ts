import { customDefinitions, customValues } from "./custom-task-fields";

describe("Custom task field values", () => {
  const schema = {
    environment: {
      label: "Environment",
      type: "select",
      required: true,
      options: ["Test", "Production"],
    },
    verified: { label: "Verified", type: "boolean" },
    count: { label: "Count", type: "number", default: 3 },
    release_date: { label: "Release date", type: "date" },
  };
  it("applies defaults while preserving false and zero", () => {
    expect(
      customValues(
        schema,
        {},
        { environment: "Test", verified: false, count: 0 },
        true,
      ),
    ).toEqual({ environment: "Test", verified: false, count: 0 });
  });
  it("requires mandatory values and rejects unknown keys", () => {
    expect(() => customValues(schema, {}, {})).toThrow(
      "Environment is required",
    );
    expect(() => customValues(schema, {}, { unknown: "x" })).toThrow(
      "Unknown custom field",
    );
  });
  it("rejects invalid types and non-calendar dates", () => {
    expect(() => customValues(schema, {}, { environment: "Other" })).toThrow(
      "Invalid value",
    );
    expect(() =>
      customValues(schema, {}, { environment: "Test", verified: "false" }),
    ).toThrow("Invalid value");
    expect(() =>
      customValues(
        schema,
        {},
        { environment: "Test", release_date: "2026-02-30" },
      ),
    ).toThrow("Invalid value");
  });
  it("clears optional fields and preserves archived values", () => {
    expect(
      customValues(
        schema,
        { environment: "Test", verified: true, legacy: "keep" },
        { verified: null },
      ),
    ).toEqual({ environment: "Test", legacy: "keep" });
  });
  it("rejects unsafe keys and unsupported field definitions", () => {
    expect(() =>
      customDefinitions({ constructor: { label: "x", type: "text" } }),
    ).toThrow();
    expect(() =>
      customDefinitions({ thing: { label: "x", type: "script" } }),
    ).toThrow();
  });
});
