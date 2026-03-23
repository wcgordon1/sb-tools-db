import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pagePath = "src/pages/inspect-bubble-upload.astro";
const shellPath = "src/components/inspect-upload/UploadShell.astro";

describe("upload inspector UI tokens", () => {
  const source = readFileSync(pagePath, "utf8");
  const shellSource = readFileSync(shellPath, "utf8");

  it("uses neutral + emerald selected-state accents (no blue selection tokens)", () => {
    expect(source).toContain("emerald-");
    expect(source.includes("blue-")).toBe(false);
  });

  it("adds explicit workflow card spacing", () => {
    expect(source).toContain("mb-4");
    expect(source).toContain("gap-3");
  });

  it("renders technical subtitle and branch summary hooks", () => {
    expect(source).toContain("technicalLabel");
    expect(source).toContain("branchSummary");
  });

  it("renders page subtabs for workflows and reusables", () => {
    expect(source).toContain("data-action=\"select-page-tab\"");
    expect(source).toContain("Workflows (${formatNumber(effectiveWorkflowCount)} total)");
    expect(source).toContain("Reusables (");
    expect(source).toContain("Total:");
    expect(source).toContain("Page:");
    expect(source).toContain("Reusable:");
  });

  it("includes top-level Reusable Elements tab and panel", () => {
    expect(source).toContain("ReusableElementsPanel");
    expect(source).toContain("data-action=\"select-reusable-catalog\"");
  });

  it("applies global cursor-pointer policy for interactive controls", () => {
    expect(source).toContain("#bubble-upload-results button");
    expect(source).toContain("cursor: pointer;");
  });

  it("renders prominent summary KPI cards with number formatting", () => {
    expect(source).toContain("data-summary-kpi");
    expect(source).toContain("text-3xl");
    expect(source).toContain("Quick KPI snapshot");
    expect(source).toContain("Intl.NumberFormat(\"en-US\")");
    expect(source.includes("Parsed from uploaded export")).toBe(false);
    expect(source.includes("Effective counts include reusable flows")).toBe(false);
    expect(source.includes("countTextByLabel")).toBe(false);
    expect(source).toContain("dotByLabel");
    expect(source).toContain("dark:text-white text-base-900");
  });

  it("adds search + clear hooks across all list surfaces", () => {
    expect(source).toContain("data-search-input");
    expect(source).toContain("data-search-clear");
    expect(source).toContain("pageList:");
    expect(source).toContain("reusableList:");
    expect(source).toContain("backend:");
    expect(source).toContain("api:");
    expect(source).toContain("graph:");
    expect(source).toContain("Clear");
    expect(source).toContain("event.key !== \"Escape\"");
    expect(source).toContain("matchesLooseSearch");
    expect(source).toContain("No results");
    expect(source).toContain("ensureSearchShell");
    expect(source).toContain("data-search-results");
    expect(source).toContain("refreshSearchById");
    expect(source).toContain("refreshPageSearchResults");
    expect(source).toContain("refreshGraphSearchResults");
    expect(source).toContain("target.value = \"\"");
  });

  it("search input handlers use targeted refresh instead of full rerender", () => {
    expect(source).toContain("document.addEventListener(\"input\"");
    expect(source).toContain("refreshSearchById(id)");
    expect(source.includes("document.addEventListener(\"input\", (event) => {\n      const target = event.target;\n      if (!(target instanceof HTMLInputElement)) return;\n      const id = target.getAttribute(\"data-search-input\");\n      if (!id || !(id in searchState)) return;\n      searchState[id] = target.value;\n      applyViewState();")).toBe(false);
  });

  it("renders graph explorer controls and actions", () => {
    expect(source).toContain("Node Browser");
    expect(source).toContain("Path Trace");
    expect(source).toContain("set-graph-depth");
    expect(source).toContain("data-depth=\"1\"");
    expect(source).toContain("data-depth=\"2\"");
    expect(source).toContain("toggle-graph-type");
    expect(source).toContain("select-graph-node");
    expect(source).toContain("select-graph-edge");
    expect(source).toContain("open-edge-workflow");
    expect(source).toContain("graphEdgeTypes");
    expect(source).toContain("graphPathTargetNode");
  });

  it("adds dropzone hooks and drag-active styling", () => {
    expect(shellSource).toContain("data-upload-dropzone");
    expect(shellSource).toContain("role=\"button\"");
    expect(source).toContain("setDropzoneActive");
    expect(source).toContain("dragenter");
    expect(source).toContain("dataTransfer");
  });
});
