import { Command } from "./Command";
import { ReaderTokenizer } from "./Reader";
import { usageFormatter } from "./Usage";

export async function runWithArgv<Context, Result>(
  argv: string[],
  context: Context,
  command: Command<Context, Result>,
): Promise<Result> {
  const readerTokenizer = new ReaderTokenizer(argv);
  readerTokenizer.registerFlag({
    key: "version",
    shorts: [],
    longs: ["version"],
  });
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
    if (readerTokenizer.consumeFlag("help")) {
      console.log(usageFormatter(commandRunner.computeUsage()));
      process.exit(0);
    }
    return await commandRunner.execute(context);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
