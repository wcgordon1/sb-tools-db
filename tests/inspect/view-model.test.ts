import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildViewRefs, buildViewStats, indexRefsByType } from "@/lib/inspect/view-model";

function loadFixture(filename: string) {
  const path = resolve(process.cwd(), "data/inspections", filename);
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("view-model", () => {
  it("billfly comment has 8 derived custom/user relationships", () => {
    const fixture = loadFixture("2026-03-18T03-33-20-276Z_app-billfly-com.json");
    const refs = buildViewRefs(fixture.database);
    const outgoingComment = refs.filter((r) => r.fromType === "🚀 Comment");

    expect(outgoingComment).toHaveLength(8);
    expect(outgoingComment.some((r) => r.fromField === "Read by" && r.toType === "User")).toBe(true);
    expect(outgoingComment.some((r) => r.fromField === "Entity-Owner")).toBe(true);
    expect(outgoingComment.some((r) => r.fromField === "F-Invoice_")).toBe(true);
    expect(outgoingComment.some((r) => r.fromField === "F-WorkOrder")).toBe(true);
    expect(outgoingComment.some((r) => r.fromField === "Parent comment")).toBe(true);
    expect(outgoingComment.some((r) => r.fromField === "Example Data")).toBe(true);
    expect(outgoingComment.some((r) => r.fromField === "F-Public-Job")).toBe(true);
    expect(outgoingComment.some((r) => r.fromField === "Sub-Entity-optional")).toBe(true);
  });

  it("excludes deleted fields and option-set links", () => {
    const refs = buildViewRefs({
      types: [
        { key: "user", name: "User", fields: [] },
        { key: "org", name: "Org", fields: [] },
        {
          key: "x",
          name: "X",
          fields: [
            {
              displayName: "Owner - deleted",
              baseType: "custom.user",
              rawType: "custom.user",
              isList: false,
            },
            {
              displayName: "Role",
              baseType: "option.some_role",
              rawType: "option.some_role",
              isList: false,
            },
            {
              displayName: "Members",
              baseType: "custom.org",
              rawType: "list.custom.org",
              isList: true,
            },
          ],
        },
      ],
    });

    expect(refs.find((r) => r.fromField === "Owner - deleted")).toBeUndefined();
    expect(refs.find((r) => r.fromField === "Role")).toBeUndefined();
    const members = refs.find((r) => r.fromField === "Members");
    expect(members).toBeDefined();
    expect(members?.isList).toBe(true);
  });

  it("ignores unknown targets and dedupes duplicate refs", () => {
    const refs = buildViewRefs({
      types: [
        { key: "user", name: "User", fields: [] },
        {
          key: "a",
          name: "A",
          fields: [
            {
              displayName: "Owner",
              baseType: "custom.user",
              rawType: "custom.user",
              isList: false,
            },
            {
              displayName: "Owner",
              baseType: "custom.user",
              rawType: "custom.user",
              isList: false,
            },
            {
              displayName: "Unknown",
              baseType: "custom.missing",
              rawType: "custom.missing",
              isList: false,
            },
          ],
        },
      ],
    });

    expect(refs.filter((r) => r.fromField === "Owner")).toHaveLength(1);
    expect(refs.find((r) => r.fromField === "Unknown")).toBeUndefined();
  });

  it("indexes refs by type and computes view stats", () => {
    const fixture = loadFixture("2026-03-18T03-33-20-276Z_app-billfly-com.json");
    const refs = buildViewRefs(fixture.database);
    const { incomingByType, outgoingByType } = indexRefsByType(refs);

    expect((outgoingByType.get("🚀 Comment") ?? []).length).toBe(8);
    expect((incomingByType.get("User") ?? []).length).toBeGreaterThan(0);

    const stats = buildViewStats(fixture.database, fixture.optionSets, refs);
    expect(stats.typeCount).toBe(49);
    expect(stats.optionSetCount).toBe(65);
    expect(stats.fieldCount).toBe(
      fixture.database.types.reduce((sum: number, t: { fields: unknown[] }) => sum + t.fields.length, 0),
    );
    expect(stats.relCount).toBe(refs.length);
  });

  it("extracts from rawType list.custom/list.user when baseType is not relationship", () => {
    const refs = buildViewRefs({
      types: [
        { key: "user", name: "User", fields: [] },
        { key: "org", name: "Org", fields: [] },
        {
          key: "task",
          name: "Task",
          fields: [
            {
              displayName: "Assignees",
              baseType: "text",
              rawType: "list.user",
              isList: true,
            },
            {
              displayName: "Teams",
              baseType: "text",
              rawType: "list.custom.org",
              isList: true,
            },
          ],
        },
      ],
    });

    expect(refs.find((r) => r.fromField === "Assignees" && r.toType === "User")?.isList).toBe(true);
    expect(refs.find((r) => r.fromField === "Teams" && r.toType === "Org")?.isList).toBe(true);
  });
});

