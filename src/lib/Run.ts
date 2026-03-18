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
    onLogStdOut?: ((message: string) => void) | undefined; // TODO - this is a problem, deep commands use console
    onLogStdErr?: ((message: string) => void) | undefined;
    onExit?: ((code: number) => never) | undefined;
    onError?: ((error: unknown) => void) | undefined;
  },
): Promise<never> {
  // TODO - can those flags could be implemented as a chained command ??
  const readerArgs = new ReaderArgs(cliArgs);
  const buildVersion = application?.buildVersion;
  if (buildVersion) {
    readerArgs.registerFlag({
      key: "version",
      shorts: [],
      longs: ["version"],
    });
  }
  const usageOnHelp = application?.usageOnHelp ?? true;
  if (usageOnHelp) {
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
  const onExit = application?.onExit ?? process.exit;
  try {
    const interpreterInstance = interpreterFactory.createInterpreterInstance();
    const onLogStdOut = application?.onLogStdOut ?? console.log;
    if (buildVersion) {
      if (readerArgs.readFlag("version")) {
        onLogStdOut([cliName, buildVersion].join(" "));
        return onExit(0);
      }
    }
    if (usageOnHelp) {
      if (readerArgs.readFlag("help")) {
        const typoSupport = chooseTypoSupport(application?.useColors);
        onLogStdOut(
          computeUsageString(cliName, interpreterFactory, typoSupport),
        );
        return onExit(0);
      }
    }
    await interpreterInstance.executeWithContext(context);
    return onExit(0);
  } catch (error) {
    if (application?.onError) {
      application.onError(error);
    } else {
      const onLogStdErr = application?.onLogStdErr ?? console.error;
      const typoSupport = chooseTypoSupport(application?.useColors);
      if (application?.usageOnError ?? true) {
        onLogStdErr(
          computeUsageString(cliName, interpreterFactory, typoSupport),
        );
      }
      onLogStdErr(computeErrorString(error, typoSupport));
    }
    return onExit(1);
  }
}

function computeErrorString(error: unknown, typoSupport: TypoSupport) {
  return [
    typoPrintableString(typoSupport, {
      value: "Error:",
      fgColor: "darkRed",
      bold: true,
    }),
    typoPrintableString(typoSupport, {
      value: error instanceof Error ? error.message : String(error),
      bold: true,
    }),
  ].join(" ");
}

function computeUsageString<Context, Result>(
  cliName: Lowercase<string>,
  commandInterpreter: CommandInterpreterFactory<Context, Result>,
  typoSupport: TypoSupport,
) {
  return usageToPrintableLines({
    cliName,
    commandUsage: commandInterpreter.generateUsage(),
    typoSupport,
  }).join("\n");
}

function chooseTypoSupport(useColors?: boolean): TypoSupport {
  if (useColors === undefined) {
    return typoInferProcessSupport();
  }
  return useColors ? "tty" : "none";
}
