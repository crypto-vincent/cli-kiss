import { Command, CommandDecoder } from "./Command";
import { optionFlag, optionSingleValue } from "./Option";
import { ReaderArgs } from "./Reader";
import { typeChoice } from "./Type";
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
  cliName: string,
  cliArgs: ReadonlyArray<string>,
  context: Context,
  command: Command<Context, void>,
  options?: {
    colorSetup?: "flag" | "env" | "always" | "never" | "mock" | undefined;
    usageOnHelp?: boolean | undefined;
    usageOnError?: boolean | undefined;
    buildVersion?: string | undefined;
    onError?: ((error: unknown) => void) | undefined;
    onExit?: ((code: number) => never) | undefined;
  },
): Promise<never> {
  const readerArgs = new ReaderArgs(cliArgs);
  const preprocessors = new Array<
    (commandDecoder: CommandDecoder<Context, void>) => undefined | number
  >();
  let typoSupport = TypoSupport.none();
  const colorSetup = options?.colorSetup ?? "flag";
  if (colorSetup === "flag") {
    const colorOption = optionSingleValue<"auto" | "always" | "never" | "mock">(
      {
        long: "color",
        type: typeChoice("color-mode", ["auto", "always", "never", "mock"]),
        valueNotDefined: () => "auto",
        valueNotInlined: () => "always",
      },
    ).registerAndMakeDecoder(readerArgs);
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
    if (colorSetup === "env") {
      typoSupport = TypoSupport.inferFromEnv();
    } else {
      typoSupport = computeTypoSupport(colorSetup);
    }
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
  /*
  // TODO - handle completions ?
  readerArgs.registerFlag({
    key: "completion",
    shorts: [],
    longs: ["completion"],
  });
  */
  const commandDecoder = command.consumeAndMakeDecoder(readerArgs);
  while (true) {
    try {
      const positional = readerArgs.consumePositional();
      if (positional === undefined) {
        break;
      }
    } catch (_) {}
  }
  const onExit = options?.onExit ?? process.exit;
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

function computeTypoSupport(
  colorMode: "auto" | "always" | "never" | "mock",
): TypoSupport {
  switch (colorMode) {
    case "auto":
      return TypoSupport.inferFromEnv();
    case "always":
      return TypoSupport.tty();
    case "never":
      return TypoSupport.none();
    case "mock":
      return TypoSupport.mock();
  }
}
