import { CommandDescriptor, CommandFactory } from "./Command";
import { ReaderArgs } from "./Reader";
import { TypoSupport } from "./Typo";
import { usageToStyledLines } from "./Usage";

export async function runAsCliAndExit<Context>(
  cliName: Lowercase<string>,
  cliArgs: ReadonlyArray<string>,
  context: Context,
  command: CommandDescriptor<Context, void>,
  application?: {
    usageOnHelp?: boolean | undefined;
    buildVersion?: string | undefined;
    useColors?: boolean | undefined;
    onExecutionError?: ((error: unknown) => void) | undefined;
    onLogStdOut?: ((message: string) => void) | undefined; // TODO - this is a problem, deep commands use console
    onLogStdErr?: ((message: string) => void) | undefined;
    onExit?: ((code: number) => never) | undefined;
  },
): Promise<never> {
  const readerArgs = new ReaderArgs(cliArgs);
  const usageOnHelp = application?.usageOnHelp ?? true;
  // TODO - this should be part of the usage ? maybe use chained command ?
  if (usageOnHelp) {
    readerArgs.registerOption({
      shorts: [],
      longs: ["help"],
      valued: false,
    });
  }
  const buildVersion = application?.buildVersion;
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
  const typoSupport = chooseTypoSupport(application?.useColors);
  const onLogStdOut = application?.onLogStdOut ?? console.log;
  const onLogStdErr = application?.onLogStdErr ?? console.error;
  const onExit = application?.onExit ?? process.exit;
  const commandFactory = command.createFactory(readerArgs);
  const errors = [];
  while (true) {
    try {
      const positional = readerArgs.consumePositional();
      if (positional === undefined) {
        break;
      }
    } catch (error) {
      errors.push(error);
    }
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
  // TODO - should we fail if errors is not empty ?
  try {
    const commandInstance = commandFactory.createInstance();
    try {
      await commandInstance.executeWithContext(context);
      return onExit(0);
    } catch (error) {
      if (application?.onExecutionError) {
        application.onExecutionError(error);
      } else {
        onLogStdErr(typoSupport.computeStyledErrorMessage(error));
      }
      return onExit(1);
    }
  } catch (error) {
    errors.unshift(error);
    onLogStdErr(computeUsageString(cliName, commandFactory, typoSupport));
    for (const error of errors) {
      onLogStdErr(typoSupport.computeStyledErrorMessage(error));
    }
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

function chooseTypoSupport(useColors?: boolean): TypoSupport {
  if (useColors === undefined) {
    return TypoSupport.inferFromProcess();
  }
  return useColors ? TypoSupport.tty() : TypoSupport.none();
}
