## mondex

> CLI tool to index MongoDB collections

## Installation

Install the package globally or alternatively you can also use `npx`

```bash
npm install -g mondex
```

## Usage

Create a JSON file containing the index definitions. The file should be an array of objects with the two properties:

- `collection`: Name of the collection
- `indexes`: Array of indexes to be created

Each index is the same as the one you would pass to `db.collection.createIndex()` in the mongo shell.

Given below is a sample JSON file representing sample index configuration:

```javascript
[
  {
    collection: "user",
    indexes: [
      { email: -1 },
      { verificationCode: -1 },
      { resetPasswordCode: -1 },
      { createdAt: -1 },
    ],
  },
  {
    collection: "resources",
    indexes: [{ resourceId: -1, resourceType: -1 }],
  },
];
```

Once you have the JSON file ready, you can use the `mondex` command to create the indexes:

```bash
Usage: mondex [options]

Shows the indexes that will be created and dropped

Options:
  -V, --version              output the version number
  -p, --plan                 shows the indexes that will be created and dropped
  -a, --apply                apply the indexes
  -f, --file <file>          path to indexes file (defaults to indexes.json in current directory)
  -i --uri <uri>             connection string for MongoDB
  -d, --database <database>  database name
  -h, --help                 display help for command
```

## Examples

> Show the indexes that will be created and dropped

```bash
mondex --uri mongodb://localhost:27017 --database mydb --file ./indexes.json
mondex --uri mongodb://localhost:27017 --database mydb --file ./indexes.json --plan
```

> Apply the indexes

```bash
mondex --uri mongodb://localhost:27017 --database mydb --file ./indexes.json --apply
```

## License

MIT &copy; [Kamran Ahmed](https://twitter.com/kamrify)
