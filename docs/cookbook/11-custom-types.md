# 11. Custom Types with `typeConverted`

Chain an existing type with a transformation to build validated domain types.

```ts
import {
  command,
  operation,
  optionSingleValue,
  runAsCliAndExit,
  typeConverted,
  typeNumber,
} from "cli-kiss";

const typePort = typeConverted(typeNumber, {
  content: "Port",
  decoder: (n) => {
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      throw new Error(`${n} is not a valid port number`);
    }
    return n;
  },
});

const serveCommand = command(
  { description: "Start the server" },
  operation(
    {
      options: {
        port: optionSingleValue({
          long: "port",
          short: "p",
          type: typePort,
          label: "PORT",
          description: "Port to listen on",
          default: () => 3000,
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { port } }) => {
      console.log(`Listening on port ${port}`);
    },
  ),
);

await runAsCliAndExit("serve", process.argv.slice(2), undefined, serveCommand);
```

```
$ serve
Listening on port 3000

$ serve --port 8080
Listening on port 8080

$ serve --port 99999
Error: --port: <PORT>: Port: 99999 is not a valid port number
```

## Combining `typeOneOf` with `typeConverted`

Map a set of string keys to a richer TypeScript type:

```ts
import { typeConverted, typeOneOf } from "cli-kiss";

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

const typeLogLevel = typeConverted(
  typeOneOf("LogLevel", Object.keys(LOG_LEVELS)),
  {
    content: "LogLevel",
    decoder: (key) => LOG_LEVELS[key as keyof typeof LOG_LEVELS] as LogLevel,
  },
);

// "--log-level warn"  →  2 (number)
```
