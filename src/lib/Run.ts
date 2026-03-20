import { CommandDescriptor, CommandFactory } from "./Command";
import { ReaderArgs } from "./Reader";
import { TypoSupport } from "./Typo";
import { usageToStyledLines } from "./Usage";

/**
 * Parses the provided CLI arguments against the given command descriptor, executes
 * the matched command, and exits the process with an appropriate exit code.
 *
 * This is the primary entry point for running a `cli-kiss`-based CLI application.
 * It handles argument parsing, `--help` / `--version` flags, usage printing on errors,
 * and exit code management.
 *
 * **Exit codes:**
 * - `0` — Command executed successfully, or `--help` / `--version` was handled.
 * - `1` — Argument parsing failed (a usage summary is also printed to stderr), or the
 *   command threw an unhandled execution error.
 *
 * **Built-in flags (opt-in):**
 * - `--help` — Enabled by default (`usageOnHelp: true`). Prints the usage summary to
 *   stdout and exits with code `0`. This flag takes precedence over `--version`.
 * - `--version` — Enabled when `buildVersion` is provided. Prints `<cliName> <version>`
 *   to stdout and exits with code `0`.
 *
 * @typeParam Context - Arbitrary value passed unchanged to the command's execution handler.
 *   Use this to inject dependencies (e.g. a database connection, a logger) into your commands.
 *
 * @param cliName - The name of the CLI program (e.g. `"my-cli"`). Used in the usage
 *   summary header and in the `--version` output.
 * @param cliArgs - The raw command-line arguments to parse, typically `process.argv.slice(2)`.
 * @param context - The context value forwarded to the command's execution handler.
 * @param command - The root {@link CommandDescriptor} that describes how to parse and execute
 *   the CLI.
 * @param options - Optional configuration for the runner.
 * @param options.useTtyColors - Controls terminal color output in styled messages.
 *   - `true` — Always apply ANSI color codes.
 *   - `false` — Never apply color codes (plain text).
 *   - `"mock"` — Use a deterministic mock style useful for snapshot testing.
 *   - `undefined` (default) — Auto-detect based on `process.stdout.isTTY` and the
 *     `FORCE_COLOR` / `NO_COLOR` environment variables.
 * @param options.usageOnHelp - When `true` (default), registers a `--help` flag that
 *   prints the usage summary and exits with code `0`.
 * @param options.usageOnError - When `true` (default), prints the usage summary to
 *   stderr before the error message whenever argument parsing fails.
 * @param options.buildVersion - When provided, registers a `--version` flag that prints
 *   `<cliName> <buildVersion>` to stdout and exits with code `0`.
 * @param options.onExecutionError - Custom handler for errors thrown during command
 *   execution. If omitted, the error is printed to stderr via {@link TypoSupport}.
 * @param options.onLogStdOut - Overrides the standard output sink (default: `console.log`).
 * @param options.onLogStdErr - Overrides the standard error sink (default: `console.error`).
 * @param options.onExit - Overrides the process exit function (default: `process.exit`).
 *   Useful for testing — supply a function that throws or captures the exit code instead
 *   of actually terminating the process.
 *
 * @returns A `Promise<never>` because the function always terminates by calling `onExit`.
 *
 * @example
 * ```ts
 * import { runAsCliAndExit, command, operation, positionalRequired, typeString } from "cli-kiss";
 *
 * const greetCommand = command(
 *   { description: "Greet someone" },
 *   operation(
 *     { options: {}, positionals: [positionalRequired({ type: typeString, label: "NAME" })] },
 *     async (_ctx, { positionals: [name] }) => {
 *       console.log(`Hello, ${name}!`);
 *     },
 *   ),
 * );
 *
 * await runAsCliAndExit("greet", process.argv.slice(2), undefined, greetCommand, {
 *   buildVersion: "1.0.0",
 * });
 * ```
 */
export async function runAsCliAndExit<Context>(
  cliName: Lowercase<string>,
  cliArgs: ReadonlyArray<string>,
  context: Context,
  command: CommandDescriptor<Context, void>,
  options?: {
    useTtyColors?: boolean | undefined | "mock";
    usageOnHelp?: boolean | undefined;
    usageOnError?: boolean | undefined;
    buildVersion?: string | undefined;
    onExecutionError?: ((error: unknown) => void) | undefined;
    onLogStdOut?: ((message: string) => void) | undefined;
    onLogStdErr?: ((message: string) => void) | undefined;
    onExit?: ((code: number) => never) | undefined;
  },
): Promise<never> {
  const readerArgs = new ReaderArgs(cliArgs);
  const usageOnHelp = options?.usageOnHelp ?? true;
  if (usageOnHelp) {
    readerArgs.registerOption({
      shorts: [],
      longs: ["help"],
      valued: false,
    });
  }
  const buildVersion = options?.buildVersion;
  if (buildVersion) {
    readerArgs.registerOption({
      shorts: [],
      longs: ["version"],
      valued: false,
    });
  }
  /*
  // TODO - handle completions ?
  readerArgs.registerFlag({
    key: "completion",
    shorts: [],
    longs: ["completion"],
  });
  */
  const typoSupport =
    options?.useTtyColors === undefined
      ? TypoSupport.inferFromProcess()
      : options.useTtyColors === "mock"
        ? TypoSupport.mock()
        : options.useTtyColors
          ? TypoSupport.tty()
          : TypoSupport.none();
  const onLogStdOut = options?.onLogStdOut ?? console.log;
  const onLogStdErr = options?.onLogStdErr ?? console.error;
  const onExit = options?.onExit ?? process.exit;
  const commandFactory = command.createFactory(readerArgs);
  while (true) {
    try {
      const positional = readerArgs.consumePositional();
      if (positional === undefined) {
        break;
      }
    } catch (_) {}
  }
  if (usageOnHelp) {
    if (readerArgs.getOptionValues("--help" as any).length > 0) {
      onLogStdOut(computeUsageString(cliName, commandFactory, typoSupport));
      return onExit(0);
    }
  }
  if (buildVersion) {
    if (readerArgs.getOptionValues("--version" as any).length > 0) {
      onLogStdOut([cliName, buildVersion].join(" "));
      return onExit(0);
    }
  }
  try {
    const commandInstance = commandFactory.createInstance();
    try {
      await commandInstance.executeWithContext(context);
      return onExit(0);
    } catch (executionError) {
      if (options?.onExecutionError) {
        options.onExecutionError(executionError);
      } else {
        onLogStdErr(typoSupport.computeStyledErrorMessage(executionError));
      }
      return onExit(1);
    }
  } catch (parsingError) {
    if (options?.usageOnError ?? true) {
      onLogStdErr(computeUsageString(cliName, commandFactory, typoSupport));
    }
    onLogStdErr(typoSupport.computeStyledErrorMessage(parsingError));
    return onExit(1);
  }
}

function computeUsageString<Context, Result>(
  cliName: Lowercase<string>,
  commandFactory: CommandFactory<Context, Result>,
  typoSupport: TypoSupport,
) {
  return usageToStyledLines({
    cliName,
    commandUsage: commandFactory.generateUsage(),
    typoSupport,
  }).join("\n");
}
