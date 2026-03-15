import { Command } from "./Command";
import { Reader } from "./Reader";

export async function run<Context, Result>(
  argv: string[],
  context: Context,
  command: Command<Context, Result>,
): Promise<Result> {
  console.log("argv:", argv);
  console.log("input:", context);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--version") {
      // TODO - version from package.json
    }
    if (arg === "--help") {
      // TODO - help message with the command usage
    }
  }
  const reader = new Reader(argv);
  const runner = command.prepare(reader);
  return await runner(context);
}
