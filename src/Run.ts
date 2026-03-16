import { Command } from "./Command";
import { ReaderTokenizer } from "./Reader";

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
  const commandRunner = command.prepareInterpreter(readerTokenizer);
  return await commandRunner.evaluate(context);
}
