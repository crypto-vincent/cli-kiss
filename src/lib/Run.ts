import { Command, CommandInterpreterFactory } from "./Command";
import { ReaderArgs } from "./Reader";
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
  const readerArgs = new ReaderArgs(cliArgs);
  if (application?.buildVersion) {
    readerArgs.registerFlag({
      key: "version",
      shorts: [],
      longs: ["version"],
    });
  }
  if (application?.usageOnHelp ?? true) {
    readerArgs.registerFlag({
      key: "help",
      shorts: [],
      longs: ["help"],
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
  const interpreterFactory = command.createInterpreterFactory(readerArgs);
  if (application?.buildVersion) {
    if (readerArgs.consumeFlag("version")) {
      (application?.onLogStdOut ?? console.log)(
        [cliName, application.buildVersion].join(" "),
      );
      return (application?.onExit ?? process.exit)(0);
    }
  }
  if (application?.usageOnHelp ?? true) {
    if (readerArgs.consumeFlag("help")) {
      (application?.onLogStdOut ?? console.log)(
        computeUsageString(cliName, interpreterFactory, application?.useColors),
      );
      return (application?.onExit ?? process.exit)(0);
    }
  }
  try {
    const interpreterInstance = interpreterFactory.createInterpreterInstance();
    try {
      // TODO - special errors ???
      await interpreterInstance.executeWithContext(context);
      return (application?.onExit ?? process.exit)(0);
    } catch (error) {
      if (application?.onError) {
        application.onError(error);
      }
      return (application?.onExit ?? process.exit)(1);
    }
  } catch (error) {
    if (application?.usageOnError ?? true) {
      (application?.onLogStdErr ?? console.error)(
        computeUsageString(cliName, interpreterFactory, application?.useColors),
      );
    }
    if (application?.onError) {
      application.onError(error);
    } else {
      const typoSupport = chooseTypoSupport(application?.useColors);
      (application?.onLogStdErr ?? console.error)(
        [
          typoPrintableString(typoSupport, {
            value: "Error:",
            color: "brightRed",
            bold: true,
          }),
          typoPrintableString(typoSupport, {
            value: error instanceof Error ? error.message : String(error),
            bold: true,
          }),
        ].join(" "),
      );
    }
    return (application?.onExit ?? process.exit)(1);
  }
}

function computeUsageString<Context, Result>(
  cliName: Lowercase<string>,
  commandInterpreter: CommandInterpreterFactory<Context, Result>,
  useColors: boolean | undefined,
) {
  return usageToPrintableLines({
    cliName,
    commandUsage: commandInterpreter.generateUsage(),
    typoSupport: chooseTypoSupport(useColors),
  }).join("\n");
}

function chooseTypoSupport(useColors?: boolean): TypoSupport {
  if (useColors === undefined) {
    return typoInferProcessSupport();
  }
  return useColors ? "tty" : "none";
}
