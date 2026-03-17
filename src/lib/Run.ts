import { Command } from "./Command";
import { ReaderTokenizer } from "./Reader";
import { typoInferSupport } from "./Typo";
import { usageToPrintableLines } from "./Usage";

export async function runCommand<Context, Result>(
  cliName: Lowercase<string>,
  cliArgs: Array<string>,
  context: Context,
  command: Command<Context, Result>,
  cliInfo?: {
    version?: string;
    helpOnError?: boolean;
  },
): Promise<Result> {
  const readerTokenizer = new ReaderTokenizer(cliArgs);
  if (cliInfo?.version) {
    readerTokenizer.registerFlag({
      key: "version",
      shorts: [],
      longs: ["version"],
    });
  }
  readerTokenizer.registerFlag({
    key: "help",
    shorts: [],
    longs: ["help"],
  });
  /*
  // TODO - handle completions ?
  readerTokenizer.registerFlag({
    key: "completion",
    shorts: [],
    longs: ["completion"],
  });
  */
  try {
    const commandRunner = command.prepareRunner(readerTokenizer);
    if (cliInfo?.version) {
      if (readerTokenizer.consumeFlag("version")) {
        console.log(cliName, cliInfo.version);
        process.exit(0);
      }
    }
    if (readerTokenizer.consumeFlag("help")) {
      console.log(
        usageToPrintableLines({
          cliName,
          commandUsage: commandRunner.computeUsage(),
          typoSupport: typoInferSupport(),
        }).join("\n"),
      );
      process.exit(0);
    }
    try {
      return await commandRunner.execute(context);
    } catch (error) {
      if (cliInfo?.helpOnError ?? true) {
        console.log(
          usageToPrintableLines({
            cliName,
            commandUsage: commandRunner.computeUsage(),
            typoSupport: typoInferSupport(),
          }).join("\n"),
        );
      }
      console.error(error); // TODO - better, prettier errors
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
