# 15. Chained Commands

Use `commandChained` to compose two stages without a named subcommand token —
the output of the first stage becomes the input context of the second.

```ts
import {
  command,
  commandChained,
  operation,
  optionSingleValue,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

// Stage 1: authenticate and produce a token payload.
const authOperation = operation(
  {
    options: {
      token: optionSingleValue({
        long: "token",
        type: typeString,
        description: "API token",
        default: () => {
          throw new Error("--token is required");
        },
      }),
    },
    positionals: [],
  },
  async (_ctx, { options: { token } }) => {
    // Validate and return the token for downstream use.
    return { token };
  },
);

// Stage 2: perform an authenticated action.
const uploadCommand = command(
  { description: "Upload a file (requires authentication)" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typeString,
          label: "FILE",
          description: "File to upload",
        }),
      ],
    },
    async ({ token }, { positionals: [file] }) => {
      console.log(`Uploading ${file} with token ${token}…`);
    },
  ),
);

const cli = commandChained(
  { description: "Authenticated upload" },
  authOperation,
  uploadCommand,
);

await runAsCliAndExit("uploader", process.argv.slice(2), undefined, cli);
```

```
$ uploader --token abc123 report.pdf
Uploading report.pdf with token abc123…

$ uploader report.pdf
Error: --token: Failed to get default value
```
