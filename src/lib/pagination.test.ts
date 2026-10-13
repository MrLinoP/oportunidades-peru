import { describe, expect, it } from "vitest";
import { paginationPages } from "./pagination";

describe("Numbered pagination", () => {
  it("shows three neighbors on either side of page 10 and both ends of 84 pages", () => {
    expect(paginationPages(10, 84)).toEqual([1, 2, "ellipsis", 7, 8, 9, 10, 11, 12, 13, "ellipsis", 83, 84]);
  });
  it("keeps first and last pages reachable without out-of-range neighbors", () => {
    expect(paginationPages(1, 84)).toEqual([1, 2, 3, 4, "ellipsis", 83, 84]);
    expect(paginationPages(84, 84)).toEqual([1, 2, "ellipsis", 81, 82, 83, 84]);
  });
  it("does not duplicate overlapping pages or insert ellipses between consecutive pages", () => {
    expect(paginationPages(4, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(paginationPages(1, 1)).toEqual([1]);
  });
});