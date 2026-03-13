import { Command } from "./command";
import { Reader } from "./Reader";

export async function run<Context, End>(
  args: string[],
  context: Context,
  command: Command<Context, any, any, End>,
): Promise<End> {
  console.log("args:", args);
  console.log("input:", context);
  const reader = new Reader(args);
  const gen = command.prep(reader);
  return await gen(context);
}
