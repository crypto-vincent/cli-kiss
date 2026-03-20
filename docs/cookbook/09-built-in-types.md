# 9. Built-in Types

| Type          | TypeScript type | Accepts                                            |
| ------------- | --------------- | -------------------------------------------------- |
| `typeString`  | `string`        | Any string                                         |
| `typeBoolean` | `boolean`       | `true`, `yes`, `false`, `no` (insensitive)         |
| `typeNumber`  | `number`        | Integers, floats, scientific notation              |
| `typeInteger` | `bigint`        | Integer strings only                               |
| `typeDate`    | `Date`          | ISO 8601 strings and anything `Date.parse` accepts |
| `typeUrl`     | `URL`           | Absolute URLs                                      |

```ts
import {
  command,
  operation,
  optionSingleValue,
  positionalRequired,
  runAsCliAndExit,
  typeDate,
  typeInteger,
  typeNumber,
  typeUrl,
} from "cli-kiss";

const scheduleCommand = command(
  { description: "Schedule a job" },
  operation(
    {
      options: {
        workers: optionSingleValue({
          long: "workers",
          type: typeInteger,
          description: "Number of workers",
          default: () => 1n,
        }),
        rate: optionSingleValue({
          long: "rate",
          type: typeNumber,
          description: "Jobs per second",
          default: () => 1.0,
        }),
      },
      positionals: [
        positionalRequired({
          type: typeUrl,
          label: "ENDPOINT",
          description: "Target URL",
        }),
        positionalRequired({
          type: typeDate,
          label: "START",
          description: "Start date (ISO 8601)",
        }),
      ],
    },
    async (
      _ctx,
      { options: { workers, rate }, positionals: [endpoint, start] },
    ) => {
      console.log(`Scheduling ${rate} job/s on ${endpoint.href}`);
      console.log(
        `Starting on ${start.toDateString()} with ${workers} workers`,
      );
    },
  ),
);

await runAsCliAndExit(
  "schedule",
  process.argv.slice(2),
  undefined,
  scheduleCommand,
);
```

```
$ schedule https://api.example.com/jobs 2024-06-01 --workers 4 --rate 0.5
Scheduling 0.5 job/s on https://api.example.com/jobs
Starting on Sat Jun 01 2024 with 4 workers
```
