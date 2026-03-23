import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ParseErrorCode,
  bubbleUploadParserConstants,
  loadBubbleExport,
  parseBubbleExport,
  parseBubbleExportFromText,
} from "@/lib/inspect/parse-bubble-upload";

const fixturePath = "data/inspections/nqu-template-37091.bubble";
const fixtureText = readFileSync(fixturePath, "utf8");

function expectedWorkflowCounts(text: string): { pages: number; reusables: number } {
  const json = JSON.parse(text);
  const app = json.root ?? json;

  const pageCount = Object.values(app.pages ?? {})
    .filter((page: any) => page && typeof page === "object" && page.type === "Page")
    .reduce(
      (sum: number, page: any) =>
        sum + Object.values(page.workflows ?? {}).filter((wf: any) => wf && typeof wf === "object").length,
      0,
    );

  const reusableCount = Object.entries(app.element_definitions ?? {})
    .filter(([key, def]: any) => key !== "length" && def && typeof def === "object" && def.type === "CustomDefinition")
    .reduce(
      (sum: number, [, def]: any) =>
        sum + Object.values(def.workflows ?? {}).filter((wf: any) => wf && typeof wf === "object").length,
      0,
    );

  return { pages: pageCount, reusables: reusableCount };
}

describe("bubble upload parser", () => {
  it("parses fixture and matches truth counts", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const expected = expectedWorkflowCounts(fixtureText);

    expect(result.data.counts.pages).toBe(6);
    expect(result.data.counts.reusables).toBe(26);
    expect(result.data.counts.backendWorkflows).toBe(14);
    expect(result.data.counts.apiConnectorCalls).toBe(13);
    expect(result.data.frontendWorkflows.filter((w) => w.scope === "page")).toHaveLength(expected.pages);
    expect(result.data.frontendWorkflows.filter((w) => w.scope === "reusable")).toHaveLength(expected.reusables);
    expect(result.data.counts.graphNodes).toBeGreaterThan(0);
    expect(result.data.counts.graphEdges).toBeGreaterThan(0);
  });

  it("joins API connector metadata and schedule API targets", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const allSteps = result.data.details.allWorkflows.flatMap((wf) => wf.steps);

    const apiConnectorStep = allSteps.find((step) => step.classification === "api_connector");
    expect(apiConnectorStep?.apiConnector).toBeTruthy();

    const scheduledApiStep = allSteps.find((step) => step.actionType === "ScheduleAPIEvent");
    expect(scheduledApiStep?.scheduleApiTarget).toBeTruthy();
  });

  it("resolves element references for element_id actions", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const allSteps = result.data.details.allWorkflows.flatMap((wf) => wf.steps);
    const stepWithElementRef = allSteps.find(
      (step) => typeof step.properties.element_id === "string",
    );
    const stepWithResolvedElement = allSteps.find(
      (step) => typeof step.properties.element_id === "string" && step.resolvedElement,
    );

    expect(stepWithElementRef).toBeTruthy();
    expect(stepWithResolvedElement).toBeTruthy();
  });

  it("does not expose settings.secure in output", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const serialized = JSON.stringify(result.data);
    expect(serialized).not.toContain("settings.secure");
    expect((result.data as any).settings).toBeUndefined();
  });

  it("builds page reusable attribution with direct and nested paths", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const pageEntries = Object.entries(result.data.pageReusableMap);
    expect(pageEntries.length).toBeGreaterThan(0);

    const oneUsage = pageEntries
      .flatMap(([, usages]) => usages)
      .find((usage) => usage.directInstancePaths.length > 0);

    expect(oneUsage).toBeTruthy();

    const nestedUsage = pageEntries
      .flatMap(([, usages]) => usages)
      .find((usage) => usage.nestedInstancePaths.length > 0);

    expect(nestedUsage).toBeTruthy();
  });

  it("emits semantic workflow display labels", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const labels = result.data.frontendWorkflows.map((wf) => wf.display.displayLabel);
    expect(labels.some((label) => label.startsWith("When"))).toBe(true);
    expect(labels.some((label) => label.startsWith("On page load"))).toBe(true);
    expect(labels.some((label) => label.includes("·"))).toBe(true);
  });

  it("includes all expected graph edge classes and valid node refs", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nodes = new Set(result.data.details.graph.nodes.map((node) => node.id));
    const edgeTypes = new Set(result.data.details.graph.edges.map((edge) => edge.type));

    expect(edgeTypes.has("page_contains_reusable")).toBe(true);
    expect(edgeTypes.has("reusable_contains_reusable")).toBe(true);
    expect(edgeTypes.has("workflow_schedules_backend")).toBe(true);
    expect(edgeTypes.has("workflow_calls_api_connector")).toBe(true);
    expect(edgeTypes.has("workflow_navigates_page")).toBe(true);

    for (const edge of result.data.details.graph.edges) {
      expect(nodes.has(edge.from)).toBe(true);
      expect(nodes.has(edge.to)).toBe(true);
    }
  });

  it("resolves reset_pw ChangePage destination to auth page", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const resetPwWorkflow = result.data.frontendWorkflows.find(
      (wf) => wf.scope === "page" && wf.ownerKey === "AAW" && wf.workflowKey === "bTIgy",
    );

    expect(resetPwWorkflow).toBeTruthy();
    const changePageStep = resetPwWorkflow?.steps.find((s) => s.actionType === "ChangePage");
    expect(changePageStep?.navigation?.targetPageKey).toBe("bTHDm");
    expect(changePageStep?.navigation?.targetPageName).toBe("auth");
    expect(changePageStep?.summary).toContain("Navigate to auth");
  });

  it("captures richer ChangePage arguments and decoded conditions", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const richWorkflow = result.data.frontendWorkflows.find(
      (wf) => wf.scope === "page" && wf.ownerKey === "bTHDm" && wf.workflowKey === "bTHFT",
    );

    expect(richWorkflow).toBeTruthy();
    const changePageStep = richWorkflow?.steps.find((s) => s.actionType === "ChangePage");
    expect(changePageStep?.decodedArguments?.some((arg) => arg.includes("url_parameters"))).toBe(true);
    expect(changePageStep?.navigation?.targetCandidates.length).toBeGreaterThan(0);
  });

  it("extracts backend workflow parameter metadata", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const workflowWithParams = result.data.backendWorkflows.find((wf) =>
      wf.backendParams.some((param) => param.sourceShape === "api_event_key_value"),
    );
    expect(workflowWithParams).toBeTruthy();
    const firstParam = workflowWithParams?.backendParams[0];
    expect(firstParam).toMatchObject({
      displayName: expect.any(String),
      typeName: expect.any(String),
      sourceShape: "api_event_key_value",
      optional: expect.any(Boolean),
      isList: expect.any(Boolean),
      inUrl: expect.any(Boolean),
    });
    expect(firstParam?.displayName).not.toBe("param");
  });

  it("computes effective page workflow rollups including reusable workflows", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const page = result.data.pages.find((p) => (result.data.pageReusableMap[p.key] ?? []).length > 0);
    expect(page).toBeTruthy();
    expect(page?.effectiveWorkflowCount).toBeGreaterThanOrEqual(page?.baseWorkflowCount ?? 0);
    expect(page?.workflowCount).toBe(page?.effectiveWorkflowCount);
    expect(page?.effectiveReusableWorkflowCount).toBeGreaterThanOrEqual(0);
  });

  it("builds grouped API connector model with granular params and response summary", () => {
    const result = parseBubbleExportFromText(fixtureText);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.apiConnectorGroups.length).toBeGreaterThan(0);
    const firstGroup = result.data.apiConnectorGroups[0];
    expect(firstGroup.resources.length).toBeGreaterThan(0);
    const firstCall = firstGroup.resources[0]?.calls[0];
    expect(firstCall).toBeTruthy();
    expect(firstCall?.technicalLabel).toContain(".");
    expect(firstCall?.requestParams).toBeTruthy();
    expect(firstCall?.responseSummary).toBeTruthy();
    expect(Array.isArray(firstCall?.responseSummary.topLevelFields)).toBe(true);
  });

  it("is deterministic for the same input", () => {
    const first = parseBubbleExportFromText(fixtureText);
    const second = parseBubbleExportFromText(fixtureText);

    expect(first).toEqual(second);
  });

  it("handles invalid JSON", () => {
    const result = parseBubbleExportFromText("{ invalid json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(ParseErrorCode.INVALID_JSON);
  });

  it("handles invalid root objects", () => {
    const result = parseBubbleExport(7 as unknown);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(ParseErrorCode.INVALID_ROOT);
  });

  it("handles missing required buckets", () => {
    const result = parseBubbleExport({ root: { pages: {}, settings: {} } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(ParseErrorCode.MISSING_REQUIRED_BUCKET);
  });

  it("enforces extension and size in loadBubbleExport", async () => {
    const unsupported = await loadBubbleExport({
      name: "fixture.json",
      size: 100,
      async text() {
        return fixtureText;
      },
    });

    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) {
      expect(unsupported.code).toBe(ParseErrorCode.UNSUPPORTED_FORMAT);
    }

    const oversized = await loadBubbleExport({
      name: "fixture.bubble",
      size: bubbleUploadParserConstants.MAX_FILE_SIZE_BYTES + 1,
      async text() {
        return fixtureText;
      },
    });

    expect(oversized.ok).toBe(false);
    if (!oversized.ok) {
      expect(oversized.code).toBe(ParseErrorCode.FILE_TOO_LARGE);
    }
  });
});
