import { describe, expect, it } from "vitest";
import { matchesSavedSearch } from "./saved-search";

const tender = { title: "Adquisición de equipos", entity: "Municipalidad de Huancayo", nomenclature: "AS-SM-12-2026-MPH-1", object_type: "Bien", regions: ["Junín", "Lima"] };

describe("saved opportunity search", () => {
  it("matches by title", () => expect(matchesSavedSearch(tender, "adquisicion")).toBe(true));
  it("matches by entity", () => expect(matchesSavedSearch(tender, "huancayo")).toBe(true));
  it("matches by nomenclature", () => expect(matchesSavedSearch(tender, "as-sm-12-2026")).toBe(true));
  it("matches by object", () => expect(matchesSavedSearch(tender, "bien")).toBe(true));
  it("matches by any region", () => expect(matchesSavedSearch(tender, "junin")).toBe(true));
  it("keeps all saved opportunities for an empty query", () => expect(matchesSavedSearch(tender, "  ")).toBe(true));
  it("excludes nonmatching opportunities", () => expect(matchesSavedSearch(tender, "Arequipa")).toBe(false));
  it("handles missing optional fields", () => expect(matchesSavedSearch({ ...tender, nomenclature: null, regions: null }, "junin")).toBe(false));
});