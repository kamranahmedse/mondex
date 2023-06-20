import { Db, MongoClient } from "mongodb";
import fs from "node:fs";
import path from "node:path";
import {
  generateNameForIndex,
  getIndexDiff,
  IndexDiff,
  printCreateIndex,
  printDiff,
  printDropIndex,
  printHeader,
} from "./utils";
import kleur from "kleur";

let client: MongoClient;
let db: Db;

export type MongoIndex = {
  name: string;
  keys: Record<string, -1 | 1>;
};

export type GivenConfig = {
  collection: string;
  indexes: (Record<string, -1 | 1> & {
    "@isUnique"?: boolean;
    "@expireAfterSeconds"?: number;
  })[];
};

export type PreparedIndex = {
  name: string;
  isUnique?: boolean;
  expireAfterSeconds?: number;
  keys: Record<string, number>;
};

async function getAllIndexes(): Promise<Record<string, MongoIndex[]>> {
  const collections = await db.collections();
  const indexes: Record<string, MongoIndex[]> = {};

  for (const collection of collections) {
    const collectionName = collection.collectionName;
    const collectionIndexes = await collection.indexes();

    indexes[collectionName] = collectionIndexes.map((collectionIndex) => ({
      name: collectionIndex.name,
      keys: collectionIndex.key,
    }));
  }

  return indexes;
}

export function prepareGivenIndexes(
  filePath: string
): Record<string, PreparedIndex[]> {
  const rawConfigs: GivenConfig[] = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  );

  return rawConfigs.reduce(
    (acc: Record<string, PreparedIndex[]>, index: GivenConfig) => {
      acc[index.collection] = index.indexes.map((index) => {
        const updatedColumns = { ...index };

        delete updatedColumns["@isUnique"];
        delete updatedColumns["@expireAfterSeconds"];

        return {
          name: generateNameForIndex(index),
          keys: updatedColumns,
          isUnique: index["@isUnique"],
          expireAfterSeconds: index["@expireAfterSeconds"],
        };
      });

      return acc;
    },
    {}
  );
}

async function applyDiff(diff: IndexDiff) {
  if (!diff.length) {
    console.log(kleur.green().gray("No changes required"));
    return;
  }

  for (let diffItem of diff) {
    const { collection, toCreate, toDrop } = diffItem;
    if (!toCreate.length && !toDrop.length) {
      continue;
    }

    const collectionObject = db.collection(collection);

    printHeader(`- Collection: ${collection}`);
    if (toDrop.length) {
      console.log("-".repeat(50));

      for (let index of toDrop) {
        printDropIndex(index, "- Dropping index");
        await collectionObject.dropIndex(index.name);
      }
    }

    if (toCreate.length) {
      console.log("-".repeat(50));
      for (let index of toCreate) {
        printCreateIndex(index, "+ Creating index");
        await collectionObject.createIndex(index.keys, {
          name: index.name,
          ...(index.isUnique && { unique: true }),
          ...(index.expireAfterSeconds && {
            expireAfterSeconds: index.expireAfterSeconds,
          }),
        });
      }
    }
  }
}

async function run() {
  // TODO: CLI Arguments
  // command can either be plan or apply
  let command: string = "apply";
  let connectionString: string = "mongodb://localhost:27017/roadmapsh";
  let dbName = "roadmapsh";
  let filePath: string = path.join(__dirname, "./indexes.json");

  client = await MongoClient.connect(connectionString);
  db = client.db(dbName);

  const existingIndexes = await getAllIndexes();
  const givenIndexes = prepareGivenIndexes(filePath);

  const indexDiff = getIndexDiff(existingIndexes, givenIndexes);

  if (command === "plan") {
    printDiff(indexDiff);
  } else {
    await applyDiff(indexDiff).catch((err) => {
      console.error(err);
    });
  }

  await client.close();
}

run()
  .then(() => {})
  .catch((err) => {
    console.error(err);
  });
