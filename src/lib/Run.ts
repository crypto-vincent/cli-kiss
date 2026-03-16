import { Command } from "./Command";
import { ReaderTokenizer } from "./Reader";
import { usageFormatter } from "./Usage";

export async function runWithArgv<Context, Result>(
  argv: string[],
  context: Context,
  command: Command<Context, Result>,
  cliInfo?: { name?: string; version?: string },
): Promise<Result> {
  const cliName = cliInfo?.name ?? argv[1]!;
  const readerTokenizer = new ReaderTokenizer(argv);
  readerTokenizer.registerFlag({
    key: "help",
    shorts: [],
    longs: ["help"],
  });
  if (cliInfo?.version) {
    readerTokenizer.registerFlag({
      key: "version",
      shorts: [],
      longs: ["version"],
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
  try {
    const commandRunner = command.prepareRunner(readerTokenizer);
    if (cliInfo?.version) {
      if (readerTokenizer.consumeFlag("version")) {
        console.log(cliName, cliInfo?.version);
        process.exit(0);
      }
    }
    if (readerTokenizer.consumeFlag("help")) {
      console.log(usageFormatter(cliName, commandRunner.computeUsage()));
      process.exit(0);
    }
    return await commandRunner.execute(context);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
