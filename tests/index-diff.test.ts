import { getIndexDiff, IndexDiff } from "../src/utils";
import { MongoIndex, PreparedIndex } from "../src";

describe("getIndexDiff", () => {
  const existingIndexes: Record<string, MongoIndex[]> = {
    collection1: [
      { name: "index1", keys: { field1: 1 } },
      { name: "index2", keys: { field2: -1 } },
    ],
    collection2: [{ name: "index3", keys: { field3: 1 } }],
  };

  const givenIndexes: Record<string, PreparedIndex[]> = {
    collection1: [
      { name: "index1", keys: { field1: 1 } },
      { name: "index2", keys: { field2: -1 } },
      { name: "index4", keys: { field4: 1 } },
    ],
    collection2: [
      { name: "index3", keys: { field3: 1 } },
      { name: "index5", keys: { field5: 1 } },
    ],
  };

  it("returns the correct index diff when there are indexes to create and drop", () => {
    const expectedIndexDiff = [
      {
        collection: "collection1",
        cap: 0,
        toCreate: [{ name: "index4", keys: { field4: 1 } }],
        toDrop: [],
      },
      {
        collection: "collection2",
        cap: 0,
        toCreate: [{ name: "index5", keys: { field5: 1 } }],
        toDrop: [],
      },
    ];

    const indexDiff = getIndexDiff(existingIndexes, givenIndexes);

    expect(indexDiff).toEqual(expectedIndexDiff);
  });

  it("returns the correct index diff when there are indexes to drop", () => {
    const expectedIndexDiff = [
      {
        collection: "collection1",
        cap: 0,
        toCreate: [],
        toDrop: [{ name: "index2", keys: { field2: -1 } }],
      },
    ];

    const indexDiff = getIndexDiff(existingIndexes, {
      collection1: [{ name: "index1", keys: { field1: 1 } }],
      collection2: [{ name: "index3", keys: { field3: 1 } }],
    });

    expect(indexDiff).toEqual(expectedIndexDiff);
  });

  it("returns an empty index diff when there are no changes", () => {
    const expectedIndexDiff: IndexDiff = [];
    const indexDiff = getIndexDiff(existingIndexes, {
      collection1: [
        { name: "index1", keys: { field1: 1 } },
        { name: "index2", keys: { field2: -1 } },
      ],
      collection2: [{ name: "index3", keys: { field3: 1 } }],
    });

    expect(indexDiff).toEqual(expectedIndexDiff);
  });

  it("ignores the _id_ index", () => {
    const expectedIndexDiff: IndexDiff = [];
    const indexDiff = getIndexDiff(
      {
        collection1: [
          { name: "_id_", keys: { field1: 1 } },
          { name: "index1", keys: { field1: 1 } },
          { name: "index2", keys: { field2: -1 } },
        ],
        collection2: [{ name: "index3", keys: { field3: 1 } }],
      },
      {
        collection1: [
          { name: "index1", keys: { field1: 1 } },
          { name: "index2", keys: { field2: -1 } },
        ],
        collection2: [{ name: "index3", keys: { field3: 1 } }],
      }
    );

    expect(indexDiff).toEqual(expectedIndexDiff);
  });
});
