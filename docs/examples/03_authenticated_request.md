# Authenticated Request

A two-stage chained command: the first stage reads an API token (from a flag or
the `API_TOKEN` env var) and the second stage uses it to make a request.

Demonstrates: `commandChained`, `optionSingleValue` with `defaultWhenNotDefined`
that throws, `positionalRequired`.

```ts
import {
  command,
  commandChained,
  operation,
  optionSingleValue,
  positionalRequired,
  runAndExit,
  type,
  typeUrl,
} from "cli-kiss";

const fetchCmd = commandChained(
  { description: "Send an authenticated GET request" },
  // Stage 1 — resolve the token
  operation(
    {
      options: {
        token: optionSingleValue({
          long: "token",
          type: type("secret"),
          description: "API token (falls back to API_TOKEN env var)",
          defaultWhenNotDefined: () => {
            const t = process.env.API_TOKEN;
            if (!t) throw new Error("Provide --token or set API_TOKEN");
            return t;
          },
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { token } }) => ({ token }),
  ),
  // Stage 2 — use the token
  command(
    { description: "Send an authenticated GET request" },
    operation(
      {
        options: {},
        positionals: [
          positionalRequired({
            type: typeUrl("url"),
            description: "URL to fetch",
          }),
        ],
      },
      async ({ token }, { positionals: [url] }) => {
        console.log(`GET ${url} (token: ${token.slice(0, 4)}…)`);
      },
    ),
  ),
);

await runAndExit("fetch-cli", process.argv.slice(2), {}, fetchCmd, {
  buildVersion: "1.0.0",
});
```

```sh
fetch-cli https://api.example.com/data --token sk-abc123
```

```text
GET https://api.example.com/data/ (token: sk-a…)
```

```sh
# Token from env var
API_TOKEN=sk-abc123 fetch-cli https://api.example.com/data
```

```text
GET https://api.example.com/data/ (token: sk-a…)
```

```sh
fetch-cli --help --color
```

```text
Usage: fetch-cli <url>

Send an authenticated GET request

Positionals:
  <url>  URL to fetch

Options:
  --token[=<secret>]  API token (falls back to API_TOKEN env var)
```
