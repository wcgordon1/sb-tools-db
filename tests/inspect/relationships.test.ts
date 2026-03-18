import { describe, expect, it } from "vitest";
import {
  buildMermaidRefs,
  collectRefsFromFields,
  mergeRefs,
  type MermaidRef,
  type MermaidTypeLike,
} from "@/lib/inspect/relationships";

describe("relationships helpers", () => {
  const types: MermaidTypeLike[] = [
    { key: "user", name: "User", fields: [] },
    { key: "organisation", name: "🏢 Company", fields: [] },
    {
      key: "_workorder",
      name: "_WorkOrder",
      fields: [
        {
          displayName: "created-by-user-owner",
          baseType: "custom.user",
          rawType: "custom.user",
          isList: false,
        },
        {
          displayName: "Allowed entities",
          baseType: "custom.organisation",
          rawType: "list.custom.organisation",
          isList: true,
        },
        {
          displayName: "F_Paused - deleted",
          baseType: "custom.organisation",
          rawType: "custom.organisation",
          isList: false,
        },
        {
          displayName: "fallback only",
          baseType: "text",
          rawType: "list.custom.organisation",
          isList: true,
        },
        {
          displayName: "unknown target",
          baseType: "custom.missing_type",
          rawType: "custom.missing_type",
          isList: false,
        },
      ],
    },
  ];

  it("collects refs from fields even when isRelationship is absent/false", () => {
    const refs = collectRefsFromFields(types);

    expect(refs).toEqual(
      expect.arrayContaining([
        {
          fromType: "_WorkOrder",
          fromField: "created-by-user-owner",
          toType: "User",
          isList: false,
        },
        {
          fromType: "_WorkOrder",
          fromField: "Allowed entities",
          toType: "🏢 Company",
          isList: true,
        },
      ]),
    );
  });

  it("excludes inferred refs from deleted fields", () => {
    const refs = collectRefsFromFields(types);
    expect(refs.find((r) => r.fromField === "F_Paused - deleted")).toBeUndefined();
  });

  it("ignores unknown custom targets safely", () => {
    const refs = collectRefsFromFields(types);
    expect(refs.find((r) => r.fromField === "unknown target")).toBeUndefined();
  });

  it("dedupes existing and inferred refs while preserving existing refs", () => {
    const existingRefs: MermaidRef[] = [
      {
        fromType: "logs",
        fromField: "user",
        toType: "User",
        isList: false,
      },
      {
        fromType: "_WorkOrder",
        fromField: "created-by-user-owner",
        toType: "User",
        isList: false,
      },
    ];
    const inferredRefs = collectRefsFromFields(types);
    const merged = mergeRefs(existingRefs, inferredRefs);

    expect(merged).toContainEqual(existingRefs[0]);
    expect(
      merged.filter(
        (r) =>
          r.fromType === "_WorkOrder" &&
          r.fromField === "created-by-user-owner" &&
          r.toType === "User" &&
          r.isList === false,
      ),
    ).toHaveLength(1);
  });

  it("buildMermaidRefs handles sparse refs + rich field metadata (billfly-style)", () => {
    const refs = buildMermaidRefs({
      types,
      refs: [
        {
          fromType: "logs",
          fromField: "user",
          toType: "User",
          isList: false,
        },
      ],
    });

    const targets = new Set(refs.map((r) => r.toType));
    expect(targets.has("User")).toBe(true);
    expect(targets.has("🏢 Company")).toBe(true);
  });
});

