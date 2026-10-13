import { describe, it, expect } from "vitest";
import { parseAmount, parseSeaceDate, tenderStatus, isValidRucSyntax, isStale } from "./tender-rules";

const now = new Date("2026-10-13T12:00:00Z");

describe("tender rules", () => {
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
