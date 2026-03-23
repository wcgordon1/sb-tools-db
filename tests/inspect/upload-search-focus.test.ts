import { describe, expect, it } from "vitest";

describe("upload inspector search focus behavior", () => {
  it("keeps focused input stable during targeted search refresh", () => {
    const searchState: Record<string, string> = {
      pageList: "",
    };

    const ui = {
      activeElement: "pageListInput",
      inputValue: "",
      clearDisabled: true,
      resultsText: "full list",
    };

    const refreshSearchById = (id: string) => {
      ui.resultsText = searchState[id] ? searchState[id] : "full list";
      ui.clearDisabled = !searchState[id];
      // Targeted refresh does not replace active element.
    };

    const handleInput = (id: string, value: string) => {
      searchState[id] = value;
      ui.inputValue = value;
      refreshSearchById(id);
    };

    const handleEscape = (id: string) => {
      searchState[id] = "";
      ui.inputValue = "";
      refreshSearchById(id);
    };

    const handleClear = (id: string) => {
      searchState[id] = "";
      ui.inputValue = "";
      refreshSearchById(id);
    };

    handleInput("pageList", "a");
    expect(ui.activeElement).toBe("pageListInput");
    expect(ui.resultsText).toBe("a");
    expect(ui.clearDisabled).toBe(false);

    handleInput("pageList", "abc");
    expect(ui.activeElement).toBe("pageListInput");
    expect(ui.resultsText).toBe("abc");

    handleEscape("pageList");
    expect(ui.inputValue).toBe("");
    expect(ui.resultsText).toBe("full list");
    expect(ui.clearDisabled).toBe(true);

    handleClear("pageList");
    expect(ui.inputValue).toBe("");
    expect(ui.resultsText).toBe("full list");
    expect(ui.clearDisabled).toBe(true);
  });
});
