import { GivenConfig, MongoIndex, PreparedIndex } from "./index";
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

export function mongoIndexToUserConfig(
  indexes: Record<string, MongoIndex[]>
): GivenConfig[] {
  return Object.keys(indexes)
    .map((collectionName) => {
      return {
        collection: collectionName,
        // @todo populate @isUnique and @expireAfterSeconds
        indexes: indexes[collectionName]
          .filter((index) => index.name !== "_id_")
          .map((index) => index.keys),
      };
    })
    .filter((collection) => collection.indexes.length > 0);
}

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

export function printSeparator() {
  console.log("-".repeat(50));
}

export function fatal(message: string, error?: Error) {
  console.log(kleur.red().bold(message));
  if (error) {
    console.log(kleur.red().bold(error.message));
  }

  process.exit(1);
}

export function printHeader(title: string) {
  console.log(kleur.underline().bold(`${title}`));
}

export function printInfo(message: string) {
  console.log(kleur.gray(message));
}

export function printSuccess(message: string) {
  console.log(kleur.bold().green(message));
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
    printInfo("No changes required");
    return;
  }

  for (const diffItem of diff) {
    const { collection, toCreate, toDrop } = diffItem;
    if (!toCreate.length && !toDrop.length) {
      continue;
    }

    printHeader(`Collection: ${collection}`);
    if (toCreate.length) {
      for (const index of toCreate) {
        printCreateIndex(index);
      }
    }

    if (toDrop.length) {
      for (const index of toDrop) {
        printDropIndex(index);
      }
    }
  }
}
