import { Command, CommandInterpreter } from "./Command";
import { ReaderTokenizer } from "./Reader";
import {
  typoInferProcessSupport,
  typoPrintableString,
  TypoSupport,
} from "./Typo";
import { usageToPrintableLines } from "./Usage";

// TODO - add unit tests for this

export async function runAndExit<Context>(
  cliName: Lowercase<string>,
  cliArgs: Array<string>,
  context: Context,
  command: Command<Context, void>,
  application?: {
    usageOnError?: boolean | undefined;
    usageOnHelp?: boolean | undefined;
    buildVersion?: string | undefined;
    useColors?: boolean | undefined;
    onLogStdOut?: ((message: string) => void) | undefined;
    onLogStdErr?: ((message: string) => void) | undefined;
    onExit?: ((code: number) => never) | undefined;
    onError?: ((error: unknown) => void) | undefined;
  },
): Promise<never> {
  const readerTokenizer = new ReaderTokenizer(cliArgs);
  if (application?.buildVersion) {
    readerTokenizer.registerFlag({
      key: "version",
      shorts: [],
      longs: ["version"],
    });
  }
  if (application?.usageOnHelp ?? true) {
    readerTokenizer.registerFlag({
      key: "help",
      shorts: [],
      longs: ["help"],
    });
  }
  /*
  // TODO - handle completions ?
  readerTokenizer.registerFlag({
    key: "completion",
    shorts: [],
    longs: ["completion"],
  });
  */
  const commandInterpreter = command.buildInterpreter(readerTokenizer);
  if (application?.buildVersion) {
    if (readerTokenizer.consumeFlag("version")) {
      (application?.onLogStdOut ?? console.log)(
        [cliName, application.buildVersion].join(" "),
      );
      return (application?.onExit ?? process.exit)(0);
    }
  }
  if (application?.usageOnHelp ?? true) {
    if (readerTokenizer.consumeFlag("help")) {
      (application?.onLogStdOut ?? console.log)(
        computeUsageString(cliName, commandInterpreter, application?.useColors),
      );
      return (application?.onExit ?? process.exit)(0);
    }
  }
  try {
    await commandInterpreter.execute(context);
    return (application?.onExit ?? process.exit)(0);
  } catch (error) {
    if (application?.usageOnError ?? true) {
      (application?.onLogStdErr ?? console.error)(
        computeUsageString(cliName, commandInterpreter, application?.useColors),
      );
    }
    if (application?.onError) {
      application.onError(error);
    } else {
      (application?.onLogStdErr ?? console.error)(
        [
          typoPrintableString(chooseTypoSupport(application?.useColors), {
            value: "Error:",
            color: "brightRed",
            bold: true,
          }),
          error instanceof Error ? error.message : error,
        ].join(" "),
      );
    }
    return (application?.onExit ?? process.exit)(1);
  }
}

function computeUsageString<Context, Result>(
  cliName: Lowercase<string>,
  commandInterpreter: CommandInterpreter<Context, Result>,
  useColors: boolean | undefined,
) {
  return usageToPrintableLines({
    cliName,
    commandUsage: commandInterpreter.computeUsage(),
    typoSupport: chooseTypoSupport(useColors),
  }).join("\n");
}

function chooseTypoSupport(useColors?: boolean): TypoSupport {
  if (useColors === undefined) {
    return typoInferProcessSupport();
  }
  return useColors ? "tty" : "none";
}
