import { Command, CommandDecoder } from "./Command";
import {
  CompletionNode,
  CompletionOption,
  generateCompletionScript,
  getCompletions,
} from "./Completion";
import { optionFlag, optionSingleValue } from "./Option";
import { ReaderArgs } from "./Reader";
import { typeChoice } from "./Type";
import { TypoSupport } from "./Typo";
import { usageToStyledLines } from "./Usage";

/**
 * Color selection modes availables
 */
export type RunColorMode = "env" | "always" | "never" | "mock";

/**
 * Main entry point: parses CLI arguments, executes the matched command, and exits.
 * Handles `--help`, `--version`, usage-on-error, and exit codes.
 *
 * Exit codes:
 *  - `0` on success / `--help` / `--version`
 *  - `1` on parse error or execution error.
 *
 * @typeParam Context - Forwarded unchanged to the handler.
 *
 * @param cliName - Program name used in usage and `--version` output.
 * @param cliArgs - Raw arguments, typically `process.argv.slice(2)`.
 * @param context - Forwarded to the handler.
 * @param command - Root {@link Command}.
 * @param options.colorSetup - Configures color support; enables `--color` flag if set to `"flag"`.
 * @param options.usageOnHelp - Enables `--help` flag (default `true`).
 * @param options.usageOnError - Prints usage to stderr on parse error (default `true`).
 * @param options.buildVersion - Enables `--version`; prints `<cliName> <buildVersion>`.
 * @param options.completionSetup - Enables shell auto-completion support. When set to `"flag"`,
 *   adds `--completion [bash|zsh|fish]` (prints a shell completion script) and
 *   `--get-completions` (returns completions for the current command line, used by shell scripts).
 * @param options.onError - Custom handler for errors.
 * @param options.onExit - Overrides `process.exit`; useful for testing.
 *
 * @returns `Promise<never>` — always calls `onExit`.
 *
 * @example
 * ```ts
 * import { runAndExit, command, operation, positionalRequired, type } from "cli-kiss";
 *
 * const greetCommand = command(
 *   { description: "Greet someone" },
 *   operation(
 *     { options: {}, positionals: [positionalRequired({ type: type("name") })] },
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
  cliName: string,
  cliArgs: ReadonlyArray<string>,
  context: Context,
  command: Command<Context, void>,
  options?: {
    colorSetup?: "flag" | RunColorMode | undefined;
    usageOnHelp?: boolean | undefined;
    usageOnError?: boolean | undefined;
    buildVersion?: string | undefined;
    completionSetup?: "flag" | undefined;
    onError?: ((error: unknown) => void) | undefined;
    onExit?: ((code: number) => never) | undefined;
  },
): Promise<never> {
  const onExit = options?.onExit ?? process.exit;

  // Handle --completion and --get-completions early, before any argument parsing,
  // so that partial or invalid args on the command line don't cause parse errors.
  if (options?.completionSetup === "flag") {
    const completionIdx = cliArgs.indexOf("--completion");
    if (completionIdx !== -1) {
      const rawShell = cliArgs[completionIdx + 1];
      const shell =
        rawShell === "bash" || rawShell === "zsh" || rawShell === "fish"
          ? rawShell
          : "bash";
      console.log(generateCompletionScript(cliName, shell));
      return onExit(0);
    }
    const gcIdx = cliArgs.indexOf("--get-completions");
    if (gcIdx !== -1) {
      const doubleIdx = cliArgs.indexOf("--", gcIdx + 1);
      const completionArgs: ReadonlyArray<string> =
        doubleIdx === -1 ? [] : cliArgs.slice(doubleIdx + 1);
      const rootNode = command.generateCompletionNode();
      const extraOptions: Array<CompletionOption> = [
        { long: "completion", hasValue: true },
        { long: "get-completions", hasValue: false },
      ];
      if (options?.usageOnHelp ?? true) {
        extraOptions.push({ long: "help", hasValue: false });
      }
      if (options?.buildVersion !== undefined) {
        extraOptions.push({ long: "version", hasValue: false });
      }
      const colorSetupForCompletion = options?.colorSetup ?? "flag";
      if (colorSetupForCompletion === "flag") {
        extraOptions.push({ long: "color", hasValue: true });
      }
      const augmentedNode: CompletionNode = {
        ...rootNode,
        options: [...rootNode.options, ...extraOptions],
      };
      for (const completion of getCompletions(augmentedNode, completionArgs)) {
        console.log(completion);
      }
      return onExit(0);
    }
  }

  const readerArgs = new ReaderArgs(cliArgs);
  const preprocessors = new Array<
    (commandDecoder: CommandDecoder<Context, void>) => undefined | number
  >();
  let typoSupport = TypoSupport.none();
  const colorSetup = options?.colorSetup ?? "flag";
  if (colorSetup === "flag") {
    const colorOption = optionSingleValue<"auto" | RunColorMode>({
      long: "color",
      type: typeChoice("color-mode", ["auto", "always", "never", "mock"]),
      fallbackValueIfAbsent: () => "auto",
      impliedValueIfNotInlined: () => "always",
    }).registerAndMakeDecoder(readerArgs);
    preprocessors.push(() => {
      try {
        typoSupport = computeTypoSupport(colorOption.getAndDecodeValue());
      } catch (error) {
        typoSupport = TypoSupport.inferFromEnv();
        throw error;
      }
      return undefined;
    });
  } else {
    typoSupport = computeTypoSupport(colorSetup);
  }
  if (options?.usageOnHelp ?? true) {
    const helpOption = optionFlag({ long: "help" }).registerAndMakeDecoder(
      readerArgs,
    );
    preprocessors.push((commandDecoder) => {
      if (!helpOption.getAndDecodeValue()) {
        return undefined;
      }
      console.log(computeUsageString(cliName, commandDecoder, typoSupport));
      return 0;
    });
  }
  if (options?.buildVersion) {
    const versionOption = optionFlag({
      long: "version",
    }).registerAndMakeDecoder(readerArgs);
    preprocessors.push(() => {
      if (!versionOption.getAndDecodeValue()) {
        return undefined;
      }
      console.log([cliName, options.buildVersion].join(" "));
      return 0;
    });
  }
  // TODO - the lifecycle of this function should be improved
  // TODO - how to pass the color information to the command logic ?
  const commandDecoder = command.consumeAndMakeDecoder(readerArgs);
  while (true) {
    try {
      const positional = readerArgs.consumePositional();
      if (positional === undefined) {
        break;
      }
    } catch (_) {}
  }
  try {
    for (const preprocessor of preprocessors) {
      const preprocessorResult = preprocessor(commandDecoder);
      if (preprocessorResult !== undefined) {
        return onExit(preprocessorResult);
      }
    }
    const commandInterpreter = commandDecoder.decodeAndMakeInterpreter();
    try {
      await commandInterpreter.executeWithContext(context);
      return onExit(0);
    } catch (executionError) {
      handleError(cliName, options?.onError, executionError, typoSupport);
      return onExit(1);
    }
  } catch (parsingError) {
    if (options?.usageOnError ?? true) {
      console.error(computeUsageString(cliName, commandDecoder, typoSupport));
    }
    handleError(cliName, options?.onError, parsingError, typoSupport);
    return onExit(1);
  }
}

function handleError(
  _cliName: string,
  onError: ((error: unknown) => void) | undefined,
  error: unknown,
  typoSupport: TypoSupport,
) {
  // TODO - should the cliName be part of the error message for logs ?
  const finalError = error;
  /*
  const finalError = new TypoError(
    new TypoText(new TypoString(cliName, typoStyleConstants)),
    error,
  );
  */
  if (onError !== undefined) {
    onError(finalError);
  } else {
    console.error(typoSupport.computeStyledErrorMessage(finalError));
  }
}

function computeUsageString<Context, Result>(
  cliName: string,
  commandDecoder: CommandDecoder<Context, Result>,
  typoSupport: TypoSupport,
) {
  return usageToStyledLines({
    cliName,
    usage: commandDecoder.generateUsage(),
    typoSupport,
  }).join("\n");
}

function computeTypoSupport(colorMode: "auto" | RunColorMode): TypoSupport {
  switch (colorMode) {
    case "auto":
      return TypoSupport.inferFromEnv();
    case "env":
      return TypoSupport.inferFromEnv();
    case "always":
      return TypoSupport.tty();
    case "never":
      return TypoSupport.none();
    case "mock":
      return TypoSupport.mock();
  }
}
