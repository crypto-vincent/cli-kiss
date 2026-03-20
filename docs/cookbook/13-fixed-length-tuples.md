# 13. Fixed-Length Tuples with `typeTuple`

Parse a delimited string into a typed fixed-length array.

```ts
import {
  command,
  operation,
  positionalRequired,
  runAsCliAndExit,
  typeNumber,
  typeTuple,
} from "cli-kiss";

const typePoint = typeTuple([typeNumber, typeNumber]);

const plotCommand = command(
  { description: "Plot a 2-D point" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typePoint,
          label: "X,Y",
          description: "Coordinates as X,Y",
        }),
      ],
    },
    async (_ctx, { positionals: [[x, y]] }) => {
      console.log(`Point: (${x}, ${y})`);
    },
  ),
);

await runAsCliAndExit("plot", process.argv.slice(2), undefined, plotCommand);
```

```
$ plot 3.14,2.71
Point: (3.14, 2.71)

$ plot 3.14
Error: <X,Y>: Number,Number: Found 1 splits: Expected 2 splits from: "3.14"
```
