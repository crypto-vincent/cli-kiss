import { Command } from "./Command";
import { ReaderTokenizer } from "./Reader";
import { typoInferSupport } from "./Typo";
import { usageToPrintableLines } from "./Usage";

export async function runWithArgv<Context, Result>(
  argv: string[],
  context: Context,
  command: Command<Context, Result>,
  cliInfo?: {
    name?: Lowercase<string>;
    version?: string;
    helpOnError?: boolean;
  },
): Promise<Result> {
  const cliName = cliInfo?.name ?? argv[1]!;
  const readerTokenizer = new ReaderTokenizer(argv.slice(2));
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
      console.error(error);
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
