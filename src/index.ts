import { Command } from "commander";
import { Db, MongoClient } from "mongodb";
import fs from "node:fs";
import path from "node:path";
import {
  fatal,
  generateNameForIndex,
  getIndexDiff,
  IndexDiff,
  mongoIndexToUserConfig,
  printCreateIndex,
  printDiff,
  printDropIndex,
  printHeader,
  printInfo,
  printSeparator,
  printSuccess,
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

    printHeader(`Collection: ${collection}`);
    if (toDrop.length) {
      for (let index of toDrop) {
        printDropIndex(index, "- Dropping index");
        await collectionObject.dropIndex(index.name);
      }
    }

    if (toCreate.length) {
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

type RunOptions = {
  file: string;
  db: string;
  uri: string;
};

function plan(options: RunOptions) {
  return execute({ ...options, command: "plan" });
}

function apply(options: RunOptions) {
  return execute({ ...options, command: "apply" });
}

function pull(options: RunOptions) {
  const { file } = options;
  if (fs.existsSync(file) && fs.readFileSync(file)) {
    fatal(`A non-empty file exists at: ${file}`);
  }

  fs.writeFileSync(file, "");

  return execute({ ...options, command: "pull" });
}

const allowedCommands = ["plan", "apply", "pull"] as const;

async function execute(
  options: RunOptions & { command: (typeof allowedCommands)[number] }
) {
  const { command, file, db: database, uri } = options;

  if (!fs.existsSync(file)) {
    fatal(`File ${file} does not exist`);
  }

  try {
    client = await MongoClient.connect(uri);
    db = client.db(database);
  } catch (err) {
    printSeparator();
    fatal(`Failed to connect to MongoDB`, err as Error);
  }

  const existingIndexes = await getAllIndexes();
  if (command === "pull") {
    if (!Object.keys(existingIndexes).length) {
      printInfo("No existing indexes found");
      fs.rmSync(file);
      process.exit(0);
    }

    fs.writeFileSync(
      file,
      JSON.stringify(mongoIndexToUserConfig(existingIndexes), null, 2)
    );

    printSuccess(`Config file written at: ${file}`);
    process.exit(0);
  }

  const givenIndexes = prepareGivenIndexes(file);
  const indexDiff = getIndexDiff(existingIndexes, givenIndexes);

  if (command == "apply") {
    await applyDiff(indexDiff).catch((err) => {
      console.error(err);
    });
  } else if (command == "plan") {
    printDiff(indexDiff);
  } else {
    fatal(`Unknown command ${command}`);
  }

  await client.close();
}

// ---------------------------
// CLI Setup
// ---------------------------
const program = new Command();

program
  .name("mondex")
  .description("CLI to index MongoDB collections")
  .version(process.env.npm_package_version || "0.0.0")
  .action(() => {
    program.help();
  })
  .showHelpAfterError(true);

program
  .command("plan")
  .description("Shows the indexes that will be created and dropped")
  .action(plan);

program
  .command("apply")
  .description("Executes the plan and applies the changes to the database")
  .action(apply);

program
  .command("pull")
  .description("Creates the index configuration file from the database")
  .action(pull);

program.commands.forEach((command) => {
  command
    .option(
      "-f, --file <file>",
      "path to the file containing the indexes",
      path.join(process.cwd(), "./indexes.json")
    )
    .requiredOption("-i --uri <uri>", "connection string for MongoDB")
    .requiredOption("-d, --db <database>", "database name");
});

program.parse();
