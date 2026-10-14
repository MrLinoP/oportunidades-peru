import { describe, it, expect } from "vitest";
import { formatStageRange as f } from "./tender-rules";
describe("formatStageRange", () => {
  it("same day without times", () => expect(f("30/09/2026", "30/09/2026", null, null)).toBe("30/09/2026"));
  it("same day start time only", () => expect(f("19/10/2026", "19/10/2026", "08:30", null)).toBe("19/10/2026, 08:30"));
  it("same day full window", () => expect(f("14/10/2026", "14/10/2026", "00:01", "23:59")).toBe("14/10/2026 (00:01 – 23:59)"));
  it("range without times", () => expect(f("15/10/2026", "19/10/2026", null, null)).toBe("15/10/2026 – 19/10/2026"));
  it("range with times", () => expect(f("01/10/2026", "13/10/2026", "00:01", "23:59")).toBe("01/10/2026, 00:01 – 13/10/2026, 23:59"));
});
