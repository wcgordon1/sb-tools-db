import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDbmlModel } from "@/lib/inspect/build-dbml-model";
import { emitDbml } from "@/lib/inspect/emit-dbml";

function loadFixture(filename: string) {
  const path = resolve(process.cwd(), "data/inspections", filename);
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("canonical dbml pipeline", () => {
  it("handles billfly strict mode migrations and preserves list semantics", () => {
    const fixture = loadFixture("2026-03-18T03-33-20-276Z_app-billfly-com.json");
    const model = buildDbmlModel(
      { database: fixture.database, optionSets: fixture.optionSets },
      { mode: "strict" },
    );

    const userTable = model.tables.find((t) => t.schema === "custom" && t.key === "user");
    expect(userTable).toBeDefined();
    const userColumns = userTable!.columns.map((c) => c.name);
    expect(userColumns.some((c) => /deleted/i.test(c))).toBe(false);
    expect(userColumns).toContain("old-emails");
    expect(userColumns).not.toContain("old-emails - deleted");
    expect(userTable!.columns.find((c) => c.name === "old-emails")?.type).toBe("string[]");

    const docsRef = model.refs.find(
      (r) =>
        r.fromSchema === "custom" &&
        r.fromTable === "user" &&
        r.fromColumn === "Billfly-SUB_Subscriber-Agreement" &&
        r.toTable === "_billfly_docs",
    );
    expect(docsRef).toBeDefined();
    expect(docsRef?.isList).toBe(true);
  });

  it("removes deleted company billing collisions in strict mode", () => {
    const fixture = loadFixture("2026-03-18T03-33-20-276Z_app-billfly-com.json");
    const model = buildDbmlModel(
      { database: fixture.database, optionSets: fixture.optionSets },
      { mode: "strict" },
    );

    const companyBilling = model.tables.find(
      (t) => t.schema === "custom" && t.key === "___company",
    );
    expect(companyBilling).toBeDefined();
    const names = companyBilling!.columns.map((c) => c.name.toLowerCase());
    expect(names.some((name) => name.includes("x-custom-privacy-policy"))).toBe(false);
    expect(names.some((name) => name.includes("x-custom-terms-conditions"))).toBe(false);
    expect(names.some((name) => name.includes("x-custom-subscriber-agreement"))).toBe(false);
  });

  it("keeps current allowed-entities field and drops deleted variant", () => {
    const fixture = loadFixture("2026-03-18T03-33-20-276Z_app-billfly-com.json");
    const model = buildDbmlModel(
      { database: fixture.database, optionSets: fixture.optionSets },
      { mode: "strict" },
    );

    const table = model.tables.find((t) => t.schema === "custom" && t.key === "_xmessage");
    expect(table).toBeDefined();
    const names = table!.columns.map((c) => c.name);
    expect(names).toContain("allowed-entities_");
    expect(names).not.toContain("allowed-entities_ - deleted - deleted");
  });

  it("extracts relationships from baseType/rawType and ignores unknown custom targets", () => {
    const model = buildDbmlModel(
      {
        database: {
          types: [
            {
              key: "user",
              name: "User",
              fields: [],
            },
            {
              key: "organisation",
              name: "Org",
              fields: [],
            },
            {
              key: "work",
              name: "Work",
              fields: [
                {
                  key: "owner",
                  displayName: "Owner",
                  rawType: "custom.user",
                  baseType: "custom.user",
                  isList: false,
                  dbType: "custom.user",
                },
                {
                  key: "orgs",
                  displayName: "Orgs",
                  rawType: "list.custom.organisation",
                  baseType: "text",
                  isList: true,
                  dbType: "custom.organisation",
                },
                {
                  key: "missing",
                  displayName: "Missing",
                  rawType: "custom.missing",
                  baseType: "custom.missing",
                  isList: false,
                  dbType: "custom.missing",
                },
              ],
            },
          ],
        },
        optionSets: { items: [] },
      },
      { mode: "strict" },
    );

    expect(
      model.refs.find(
        (r) => r.fromTable === "work" && r.fromColumn === "Owner" && r.toTable === "user",
      ),
    ).toBeDefined();
    expect(
      model.refs.find(
        (r) => r.fromTable === "work" && r.fromColumn === "Orgs" && r.toTable === "organisation",
      )?.isList,
    ).toBe(true);
    expect(model.refs.find((r) => r.fromColumn === "Missing")).toBeUndefined();
  });

  it("emits option tables without fake option refs", () => {
    const fixture = loadFixture("2026-03-18T03-26-37-473Z_launchclub-ai.json");
    const model = buildDbmlModel(
      { database: fixture.database, optionSets: fixture.optionSets },
      { mode: "strict" },
    );

    const optionTables = model.tables.filter((t) => t.schema === "option");
    expect(optionTables.length).toBeGreaterThan(0);
    expect(model.refs.some((r) => r.toSchema === "option" || r.fromSchema === "option")).toBe(
      false,
    );
  });

  it("forensic mode preserves duplicate deleted fields with deterministic suffixing", () => {
    const model = buildDbmlModel(
      {
        database: {
          types: [
            {
              key: "x",
              name: "X",
              fields: [
                {
                  key: "privacy_file",
                  displayName: "x-custom-privacy-policy - deleted - deleted",
                  rawType: "file",
                  baseType: "file",
                  isList: false,
                  dbType: "file",
                },
                {
                  key: "privacy_doc",
                  displayName: "x-custom-privacy-policy - deleted - deleted",
                  rawType: "custom.docs",
                  baseType: "custom.docs",
                  isList: false,
                  dbType: "custom.docs",
                },
              ],
            },
            { key: "docs", name: "Docs", fields: [] },
            { key: "user", name: "User", fields: [] },
          ],
        },
        optionSets: { items: [] },
      },
      { mode: "forensic" },
    );

    const table = model.tables.find((t) => t.key === "x");
    expect(table).toBeDefined();
    const names = table!.columns.map((c) => c.name);
    expect(
      names.some((n) => n.includes("[privacy_doc]")) ||
        names.some((n) => n.includes("[privacy_file]")),
    ).toBe(true);
  });

  it("is deterministic and idempotent for repeated generation", () => {
    const fixture = loadFixture("2026-03-18T03-33-20-276Z_app-billfly-com.json");
    const modelA = buildDbmlModel(
      { database: fixture.database, optionSets: fixture.optionSets },
      { mode: "strict" },
    );
    const modelB = buildDbmlModel(
      { database: fixture.database, optionSets: fixture.optionSets },
      { mode: "strict" },
    );
    const dbmlA = emitDbml(modelA, "billfly");
    const dbmlB = emitDbml(modelB, "billfly");
    expect(dbmlA).toBe(dbmlB);
  });
});
