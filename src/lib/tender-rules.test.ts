import { describe, it, expect } from "vitest";
import { parseAmount, parseSeaceDate, tenderStatus, isValidRucSyntax, isStale, suggestionFacts, validSuggestionIds, formatMoney, currencyAliases, currencyDescription, officialOpportunitySearchUrl } from "./tender-rules";

const now = new Date("2026-10-13T12:00:00Z");

describe("tender rules", () => {
  it("links the official search to the exact nomenclature and current year", () => {
    expect(officialOpportunitySearchUrl("CP-ABR-4-2026-MPCH-1", now)).toBe("https://contratacionesabiertas.oece.gob.pe/busqueda?search=CP-ABR-4-2026-MPCH-1&year=2026");
    const url = new URL(officialOpportunitySearchUrl("CP-ABR-63-2026-MGP/DIRCOMAR-1", new Date("2027-01-01T05:00:00Z")));
    expect(url.searchParams.get("search")).toBe("CP-ABR-63-2026-MGP/DIRCOMAR-1");
    expect(url.searchParams.get("year")).toBe("2027");
  });
  it("formats every sol alias with S/ without changing the amount", () => {
    for (const currency of ["Soles", "Nuevos Soles", "PEN", "S/.", "S/"]) {
      expect(formatMoney(80000, currency)).toBe("S/ 80,000.00");
    }
    expect(formatMoney(95509.74, "Soles")).toBe("S/ 95,509.74");
  });
  it("preserves dollars and unknown currencies instead of relabeling as soles", () => {
    expect(formatMoney(166887.61, "Dólar Norteamericano")).toBe("US$ 166,887.61");
    expect(formatMoney(100, "USD")).toBe("US$ 100.00");
    expect(formatMoney(100, "EUR")).toBe("EUR 100.00");
  });
  it("shows the known currency even when the amount is not reported", () => {
    expect(formatMoney(null, "Soles")).toBe("No informado (S/)");
    expect(formatMoney(null, "Dólar Norteamericano")).toBe("No informado (US$)");
    expect(formatMoney(null, null)).toBe("No informado");
  });
  it("describes the original currency for the detail field", () => {
    expect(currencyDescription("PEN")).toBe("Soles (S/)");
    expect(currencyDescription("Nuevos Soles")).toBe("Soles (S/)");
    expect(currencyDescription("USD")).toBe("Dólar Norteamericano (US$)");
    expect(currencyDescription("EUR")).toBe("EUR");
    expect(currencyDescription(null)).toBe("No informado");
  });
  it("currency filters include the actual SEACE currency labels", () => {
    expect(currencyAliases("Soles")).toEqual(["Soles", "Nuevos Soles", "PEN", "S/.", "S/"]);
    expect(currencyAliases("Dólares")).toEqual(["Dólar Norteamericano", "Dólares", "USD", "US$"]);
  });
  it("suggestions use title, object, regions and item names, never bases", () => {
    const facts = suggestionFacts({ id: "real", title: "Supervisión de puente", object_type: "Consultoría de Obra", regions: ["Junín"], tender_items: [{ description: "Supervisión técnica", cubso_label: null, region: "Junín" }] });
    expect(facts).toEqual({ id: "real", titulo: "Supervisión de puente", objeto: "Consultoría de Obra", regiones: ["Junín"], items: [{ nombre: "Supervisión técnica", region: "Junín" }] });
  });
  it("suggestions retain only real candidate ids without duplicates", () => {
    expect(validSuggestionIds(["real", "invented", "real"], [{ id: "real" }])).toEqual(["real"]);
  });
  it("missing amount is null, never zero", () => {
    expect(parseAmount("---")).toBeNull();
    expect(parseAmount("41706213.29")).toBe(41706213.29);
  });
  it("parses Lima dates and keeps date-only flag", () => {
    expect(parseSeaceDate("25/10/2026 23:59:00")?.iso).toBe("2026-10-26T04:59:00.000Z");
    expect(parseSeaceDate("03/07/2026")?.dateOnly).toBe(true);
    expect(parseSeaceDate(null)).toBeNull();
  });
  it("no closing date => por confirmar", () => {
    expect(tenderStatus({ closing_at: null, listed_in_source: true }, now)).toBe("por_confirmar");
  });
  it("past closing => cerrada", () => {
    expect(tenderStatus({ closing_at: "2026-10-01T00:00:00Z", listed_in_source: true }, now)).toBe("cerrada");
  });
  it("future closing and listed => abierta", () => {
    expect(tenderStatus({ closing_at: "2026-11-01T00:00:00Z", listed_in_source: true }, now)).toBe("abierta");
  });
  it("future closing but no longer listed => por confirmar", () => {
    expect(tenderStatus({ closing_at: "2026-11-01T00:00:00Z", listed_in_source: false }, now)).toBe("por_confirmar");
  });
  it("RUC must be 11 digits", () => {
    expect(isValidRucSyntax("20123456789")).toBe(true);
    expect(isValidRucSyntax("2012345678")).toBe(false);
  });
  it("stale after 24h", () => {
    expect(isStale("2026-10-12T11:00:00Z", now)).toBe(true);
    expect(isStale("2026-10-13T10:00:00Z", now)).toBe(false);
  });
});
