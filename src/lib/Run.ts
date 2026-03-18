import { Command, CommandInterpreter } from "./Command";
import { ReaderTokenizer } from "./Reader";
import { typoInferProcessSupport, TypoSupport } from "./Typo";
import { usageToPrintableLines } from "./Usage";

export async function runAndExit<Context>(
  cliName: Lowercase<string>,
  cliArgs: Array<string>,
  context: Context,
  command: Command<Context, void>,
  application?: {
    usageOnError?: boolean;
    usageOnHelp?: boolean;
    buildVersion?: string;
    useColors?: boolean;
    onMessage?: (message: string) => void;
    onError?: (error: any) => void;
    onExit?: (code: number) => never;
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
      (application?.onMessage ?? console.log)(
        [cliName, application.buildVersion].join(" "),
      );
      return (application?.onExit ?? process.exit)(0);
    }
  }
  if (application?.usageOnHelp ?? true) {
    if (readerTokenizer.consumeFlag("help")) {
      logUsageMessage(cliName, commandInterpreter, application);
      return (application?.onExit ?? process.exit)(0);
    }
  }
  try {
    await commandInterpreter.execute(context);
    return (application?.onExit ?? process.exit)(0);
  } catch (error) {
    if (application?.usageOnError ?? true) {
      logUsageMessage(cliName, commandInterpreter, application);
    }
    (application?.onError ?? console.error)(error);
    return (application?.onExit ?? process.exit)(1);
  }
}

function logUsageMessage<Context, Result>(
  cliName: Lowercase<string>,
  commandInterpreter: CommandInterpreter<Context, Result>,
  application?: { useColors?: boolean; onMessage?: (message: string) => void },
) {
  (application?.onMessage ?? console.log)(
    usageToPrintableLines({
      cliName,
      commandUsage: commandInterpreter.computeUsage(),
      typoSupport: chooseTypoSupport(application?.useColors),
    }).join("\n"),
  );
}

function chooseTypoSupport(useColors?: boolean): TypoSupport {
  if (useColors === undefined) {
    return typoInferProcessSupport();
  }
  return useColors ? "tty" : "none";
}
