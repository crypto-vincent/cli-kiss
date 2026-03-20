# 16. Passing Context (Dependency Injection)

The `context` parameter of `runAsCliAndExit` flows unchanged to every command
handler. Use it to inject shared resources — loggers, database connections, HTTP
clients, etc. — without global state.

```ts
import {
  command,
  operation,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

// Define your context type.
type AppContext = {
  logger: { info: (msg: string) => void };
  apiBaseUrl: string;
};

const getUserCommand = command(
  { description: "Fetch a user by ID" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typeString,
          label: "ID",
          description: "User ID",
        }),
      ],
    },
    async ({ logger, apiBaseUrl }, { positionals: [id] }) => {
      logger.info(`GET ${apiBaseUrl}/users/${id}`);
    },
  ),
);

const context: AppContext = {
  logger: { info: console.log },
  apiBaseUrl: "https://api.example.com",
};

await runAsCliAndExit("myapp", process.argv.slice(2), context, getUserCommand);
```

```
$ myapp 42
GET https://api.example.com/users/42
```
