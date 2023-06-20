import { MongoIndex, GivenConfig, PreparedIndex } from "./index";
import kleur from "kleur";

export function generateNameForIndex(index: GivenConfig["indexes"][0]) {
  return Object.keys(index)
    .filter((key) => ["@expireAfterSeconds", "@isUnique"].indexOf(key) === -1)
    .map((key) => `${key}_${index[key]}`)
    .join("_");
}

export type IndexDiff = {
  collection: string;
  toCreate: PreparedIndex[];
  toDrop: MongoIndex[];
}[];

export function getIndexDiff(
  existingIndexes: Record<string, MongoIndex[]>,
  givenIndexes: Record<string, PreparedIndex[]>
): IndexDiff {
  const indexDiff: IndexDiff = [];

  for (const collectionName in givenIndexes) {
    const existingCollectionIndexes = existingIndexes[collectionName] || [];
    const givenCollectionIndexes = givenIndexes[collectionName];

    const toCreate: PreparedIndex[] = [];
    const toDrop: MongoIndex[] = [];

    // Prepare the indexes to create and drop
    for (const givenIndex of givenCollectionIndexes) {
      const existingIndex = existingCollectionIndexes.find(
        (index) => index.name === givenIndex.name
      );

      if (!existingIndex) {
        toCreate.push(givenIndex);
        continue;
      }

      const indexChanged =
        JSON.stringify(existingIndex.keys) !== JSON.stringify(givenIndex.keys);
      if (existingIndex.name !== "_id_" && indexChanged) {
        toDrop.push(existingIndex);
        toCreate.push(givenIndex);
      }
    }

    // Find the existing indexes that are not in the given indexes
    for (const existingIndex of existingCollectionIndexes) {
      const givenIndex = givenCollectionIndexes.find(
        (index) => index.name === existingIndex.name
      );

      // Do not drop the default _id_ index
      if (!givenIndex && existingIndex.name !== "_id_") {
        toDrop.push(existingIndex);
      }
    }

    if (toCreate.length || toDrop.length) {
      indexDiff.push({
        collection: collectionName,
        toCreate,
        toDrop,
      });
    }
  }

  return indexDiff;
}

export function printHeader(title: string) {
  console.log("-".repeat(50));
  console.log(kleur.bold(`${title}`));
}

export function printCreateIndex(index: PreparedIndex, prefix = "+ Create") {
  const { name, isUnique, expireAfterSeconds, keys } = index;
  let indexDetails = `${kleur.green().bold(name)} ${kleur.green(
    JSON.stringify(keys)
  )}`;

  if (isUnique) {
    indexDetails += kleur.gray().italic(" (unique)");
  }

  if (expireAfterSeconds) {
    indexDetails += kleur.gray().italic(` (expires: ${expireAfterSeconds})`);
  }

  console.log(`${prefix} ${indexDetails}`);
}

export function printDropIndex(index: MongoIndex, prefix = "- Drop") {
  const { name, keys } = index;
  const indexDetails = `${kleur.red().bold(name)} ${kleur
    .red()
    .bold(JSON.stringify(keys))}`;

  console.log(`${prefix} ${indexDetails}`);
}

export function printDiff(diff: IndexDiff) {
  if (!diff.length) {
    console.log(kleur.gray().bold("No changes required"));
    return;
  }

  for (const diffItem of diff) {
    const { collection, toCreate, toDrop } = diffItem;
    if (!toCreate.length && !toDrop.length) {
      continue;
    }

    printHeader(`- Collection: ${collection}`);
    if (toCreate.length) {
      console.log("-".repeat(50));
      for (const index of toCreate) {
        printCreateIndex(index);
      }
    }

    if (toDrop.length) {
      console.log("-".repeat(50));
      for (const index of toDrop) {
        printDropIndex(index);
      }
    }

    console.log("-".repeat(50));
    console.log("\n");
  }
}
