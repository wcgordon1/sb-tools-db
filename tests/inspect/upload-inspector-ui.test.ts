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
    expect(source).toContain("Workflows (");
    expect(source).toContain("Reusables (");
  });

  it("includes top-level Reusable Elements tab and panel", () => {
    expect(source).toContain("ReusableElementsPanel");
    expect(source).toContain("data-action=\"select-reusable-catalog\"");
  });

  it("applies global cursor-pointer policy for interactive controls", () => {
    expect(source).toContain("#bubble-upload-results button");
    expect(source).toContain("cursor: pointer;");
  });

  it("renders prominent summary KPI cards and subtitle", () => {
    expect(source).toContain("data-summary-kpi");
    expect(source).toContain("text-3xl");
    expect(source).toContain("Quick KPI snapshot");
  });

  it("adds dropzone hooks and drag-active styling", () => {
    expect(shellSource).toContain("data-upload-dropzone");
    expect(shellSource).toContain("role=\"button\"");
    expect(source).toContain("setDropzoneActive");
    expect(source).toContain("dragenter");
    expect(source).toContain("dataTransfer");
  });
});
