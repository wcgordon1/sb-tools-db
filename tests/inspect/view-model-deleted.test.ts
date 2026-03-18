import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildDeletedTypes,
  buildViewRefs,
  buildViewStats,
  indexRefsByType,
} from "@/lib/inspect/view-model";

function loadFixture(filename: string) {
  const path = resolve(process.cwd(), "data/inspections", filename);
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("view-model deleted mode", () => {
  it("extracts deleted-only fields from billfly fixture", () => {
    const fixture = loadFixture("2026-03-18T03-33-20-276Z_app-billfly-com.json");
    const deletedTypes = buildDeletedTypes(fixture.database);
    const deletedFieldCount = deletedTypes.reduce((sum, t) => sum + t.fields.length, 0);

    expect(deletedTypes.length).toBeGreaterThan(0);
    expect(deletedFieldCount).toBeGreaterThan(0);
    expect(
      deletedTypes.some(
        (t) => t.name === "User" && t.fields.some((f) => /deleted/i.test(f.displayName)),
      ),
    ).toBe(true);
  });

  it("builds deleted relationships from deleted fields and excludes option links", () => {
    const refs = buildViewRefs(
      {
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
                displayName: "Teams - deleted",
                baseType: "text",
                rawType: "list.custom.org",
                isList: true,
              },
              {
                displayName: "Role - deleted",
                baseType: "option.some_role",
                rawType: "option.some_role",
                isList: false,
              },
            ],
          },
        ],
      },
      { includeDeleted: true },
    );

    expect(refs.find((r) => r.fromField === "Owner - deleted" && r.toType === "User")).toBeDefined();
    expect(refs.find((r) => r.fromField === "Teams - deleted" && r.toType === "Org")?.isList).toBe(true);
    expect(refs.find((r) => r.fromField === "Role - deleted")).toBeUndefined();
  });

  it("dedupes deleted refs and ignores unknown targets safely", () => {
    const refs = buildViewRefs(
      {
        types: [
          { key: "user", name: "User", fields: [] },
          {
            key: "a",
            name: "A",
            fields: [
              {
                displayName: "Owner - deleted",
                baseType: "custom.user",
                rawType: "custom.user",
                isList: false,
              },
              {
                displayName: "Owner - deleted",
                baseType: "custom.user",
                rawType: "custom.user",
                isList: false,
              },
              {
                displayName: "Unknown - deleted",
                baseType: "custom.missing",
                rawType: "custom.missing",
                isList: false,
              },
            ],
          },
        ],
      },
      { includeDeleted: true },
    );

    expect(refs.filter((r) => r.fromField === "Owner - deleted")).toHaveLength(1);
    expect(refs.find((r) => r.fromField === "Unknown - deleted")).toBeUndefined();
  });

  it("deleted-field count used in stats matches deleted model size", () => {
    const fixture = loadFixture("2026-03-18T03-33-20-276Z_app-billfly-com.json");
    const deletedTypes = buildDeletedTypes(fixture.database);
    const deletedFieldCount = deletedTypes.reduce((sum, t) => sum + t.fields.length, 0);
    const deletedRefs = buildViewRefs(fixture.database, { includeDeleted: true });

    const stats = buildViewStats(fixture.database, fixture.optionSets, deletedRefs, {
      deletedFieldCount,
    });
    expect(stats.deletedFieldCount).toBe(deletedFieldCount);
  });

  it("indexes deleted refs by type", () => {
    const refs = buildViewRefs(
      {
        types: [
          { key: "user", name: "User", fields: [] },
          {
            key: "a",
            name: "A",
            fields: [
              {
                displayName: "Owner - deleted",
                baseType: "custom.user",
                rawType: "custom.user",
                isList: false,
              },
            ],
          },
        ],
      },
      { includeDeleted: true },
    );
    const { incomingByType, outgoingByType } = indexRefsByType(refs);
    expect((outgoingByType.get("A") ?? []).length).toBe(1);
    expect((incomingByType.get("User") ?? []).length).toBe(1);
  });
});

