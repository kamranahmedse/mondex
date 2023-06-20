import { generateNameForIndex } from "../utils";

describe("Tests index creation", function () {
  // Disable console and MongoDB
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it.each([
    [{ a: 1, b: -1 }, "a_1_b_-1"],
    [{ a: 1, b: 1 }, "a_1_b_1"],
    [{ a: -1, b: -1 }, "a_-1_b_-1"],
    [{ a: -1, b: 1 }, "a_-1_b_1"],
  ])("can generate name of index", (index: any, expected) => {
    expect(generateNameForIndex(index)).toEqual(expected);
  });
});
