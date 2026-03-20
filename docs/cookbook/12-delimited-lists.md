# 12. Delimited Lists with `typeList`

Parse a comma-separated (or any-separator) string into an array in a single option.

```ts
import {
  command,
  operation,
  optionSingleValue,
  runAsCliAndExit,
  typeList,
  typeString,
} from "cli-kiss";

const buildCommand = command(
  { description: "Build with feature flags" },
  operation(
    {
      options: {
        features: optionSingleValue({
          long: "features",
          type: typeList(typeString),
          label: "FEATURE,...",
          description: "Comma-separated feature flags",
          default: () => [],
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { features } }) => {
      console.log("Features:", features);
    },
  ),
);

await runAsCliAndExit("build", process.argv.slice(2), undefined, buildCommand);
```

```
$ build --features ssr,pwa,analytics
Features: [ 'ssr', 'pwa', 'analytics' ]
```

> **Note:** `typeList` uses `","` as the default separator. Pass a second
> argument to change it, e.g. `typeList(typeString, ":")` for colon-separated
> values.

> **Tip:** Prefer `optionRepeatable` when each value should be a separate flag
> (`--file a --file b`). Use `typeList` when a single delimited string is more
> ergonomic (`--files a,b`).
