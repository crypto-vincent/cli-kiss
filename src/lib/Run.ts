import { Command, CommandDecoder } from "./Command";
import { ReaderArgs } from "./Reader";
import { TypoSupport } from "./Typo";
import { usageToStyledLines } from "./Usage";

/**
 * Main entry point: parses CLI arguments, executes the matched command, and exits.
 * Handles `--help`, `--version`, usage-on-error, and exit codes.
 *
 * Exit codes:
 *  - `0` on success / `--help` / `--version`
 *  - `1` on parse error or execution error.
 *
 * @typeParam Context - Passed unchanged to the command handler; use to inject dependencies.
 *
 * @param cliName - Program name used in usage and `--version` output.
 * @param cliArgs - Raw arguments, typically `process.argv.slice(2)`.
 * @param context - Forwarded to the command handler, injected dependencies.
 * @param command - Root {@link Command}.
 * @param options.useTtyColors - Color mode: `true` (always), `false` (never),
 *   `"mock"` (snapshot-friendly), `undefined` (auto-detect from env).
 * @param options.usageOnHelp - Enables `--help` flag (default `true`).
 * @param options.usageOnError - Prints usage to stderr on parse error (default `true`).
 * @param options.buildVersion - Enables `--version`; prints `<cliName> <buildVersion>`.
 * @param options.onError - Custom handler for errors.
 * @param options.onExit - Overrides `process.exit`; useful for testing.
 *
 * @returns `Promise<never>` — always calls `onExit`.
 *
 * @example
 * ```ts
 * import { runAndExit, command, operation, positionalRequired, typeString } from "cli-kiss";
 *
 * const greetCommand = command(
 *   { description: "Greet someone" },
 *   operation(
 *     { options: {}, positionals: [positionalRequired({ type: typeString, label: "NAME" })] },
 *     async function (_ctx, { positionals: [name] }) {
 *       console.log(`Hello, ${name}!`);
 *     },
 *   ),
 * );
 *
 * await runAndExit("greet", process.argv.slice(2), undefined, greetCommand, {
 *   buildVersion: "1.0.0",
 * });
 * ```
 */
export async function runAndExit<Context>(
  cliName: Lowercase<string>,
  cliArgs: ReadonlyArray<string>,
  context: Context,
  command: Command<Context, void>,
  options?: {
    useTtyColors?: boolean | undefined | "mock"; // TODO - flag setter option
    usageOnHelp?: boolean | undefined;
    usageOnError?: boolean | undefined;
    buildVersion?: string | undefined;
    onError?: ((error: unknown) => void) | undefined;
    onExit?: ((code: number) => never) | undefined;
  },
): Promise<never> {
  const readerArgs = new ReaderArgs(cliArgs);
  const usageOnHelp = options?.usageOnHelp ?? true;
  if (usageOnHelp) {
    readerArgs.registerOption({
      shorts: [],
      longs: ["help"],
      parsing: {
        consumeShortGroup: false,
        consumeNextArg: () => false,
      },
    });
  }
  const buildVersion = options?.buildVersion;
  if (buildVersion) {
    readerArgs.registerOption({
      shorts: [],
      longs: ["version"],
      parsing: {
        consumeShortGroup: false,
        consumeNextArg: () => false,
      },
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
  // TODO - handle color flag ?
  const commandDecoder = command.consumeAndMakeDecoder(readerArgs);
  while (true) {
    try {
      const positional = readerArgs.consumePositional();
      if (positional === undefined) {
        break;
      }
    } catch (_) {}
  }
  const typoSupport = computeTypoSupport(options?.useTtyColors);
  const onExit = options?.onExit ?? process.exit;
  if (usageOnHelp) {
    if (readerArgs.getOptionValues("--help" as any).length > 0) {
      console.log(computeUsageString(cliName, commandDecoder, typoSupport));
      return onExit(0);
    }
  }
  if (buildVersion) {
    if (readerArgs.getOptionValues("--version" as any).length > 0) {
      console.log([cliName, buildVersion].join(" "));
      return onExit(0);
    }
  }
  try {
    const commandInterpreter = commandDecoder.decodeAndMakeInterpreter();
    try {
      await commandInterpreter.executeWithContext(context);
      return onExit(0);
    } catch (executionError) {
      handleError(options?.onError, executionError, typoSupport);
      return onExit(1);
    }
  } catch (parsingError) {
    if (options?.usageOnError ?? true) {
      console.error(computeUsageString(cliName, commandDecoder, typoSupport));
    }
    handleError(options?.onError, parsingError, typoSupport);
    return onExit(1);
  }
}

function handleError(
  onError: ((error: unknown) => void) | undefined,
  error: unknown,
  typoSupport: TypoSupport,
) {
  if (onError !== undefined) {
    onError(error);
  } else {
    console.error(typoSupport.computeStyledErrorMessage(error));
  }
}

function computeUsageString<Context, Result>(
  cliName: Lowercase<string>,
  commandDecoder: CommandDecoder<Context, Result>,
  typoSupport: TypoSupport,
) {
  return usageToStyledLines({
    cliName,
    commandUsage: commandDecoder.generateUsage(),
    typoSupport,
  }).join("\n");
}

function computeTypoSupport(
  useTtyColors: boolean | undefined | "mock",
): TypoSupport {
  return useTtyColors === undefined
    ? TypoSupport.inferFromProcess()
    : useTtyColors === "mock"
      ? TypoSupport.mock()
      : useTtyColors
        ? TypoSupport.tty()
        : TypoSupport.none();
}
