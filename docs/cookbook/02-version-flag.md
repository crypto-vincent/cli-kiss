# 2. Adding a Version Flag

Pass `buildVersion` to automatically handle `--version`.

```ts
await runAsCliAndExit("greet", process.argv.slice(2), undefined, greetCommand, {
  buildVersion: "1.2.0",
});
```

```
$ greet --version
greet 1.2.0
```
