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

Index format is same as the one you would pass to `db.collection.createIndex()` in the mongo shell.

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

Once you have the JSON file ready, you can use the `mondex` to start managing your indexes.

### Available Commands

Here is the list of mondex commands that you can use

* `pull` — lets you create index configuration file by pulling existing indexes from your database
* `plan` — shows the indexes to be created or dropped
* `apply` — applies the changes from the configuration file (i.e. apply or drop indexes)

The list of options accepted by mondex are

```bash
Usage: mondex <command> [options]

Commands:
  pull                       Creates index configuration from database
  plan                       Shows the index changes to be applied to database
  apply                      Applies the index changes from configuration to database

Options:
  -V, --version              output the version number
  -h, --help                 display help for command

  -f, --file <file>          path to indexes file (defaults to indexes.json in current directory)
  -i --uri <uri>             connection string for MongoDB
  -d, --database <database>  database name
```

## Examples

> Show the indexes that will be created and dropped

```bash
mondex --uri mongodb://localhost:27017 --database mydb --file ./indexes.json
mondex --uri mongodb://localhost:27017 --database mydb --file ./indexes.json --plan
```

> Apply the changes from index configuration

```bash
mondex --uri mongodb://localhost:27017 --database mydb --file ./indexes.json --apply
```

> 

## License

MIT &copy; [Kamran Ahmed](https://twitter.com/kamrify)
