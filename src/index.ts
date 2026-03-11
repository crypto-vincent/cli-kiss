import { Reader } from "./Reader";

export function subcommands<Input, Output>(subcommands: {
  [key: string]: Command<Input, Output>;
}) {
  return async (reader: Reader, input: Input) => {
    const name = reader.nextPositional();
    if (!name) {
      throw new Error("No subcommand provided");
    }
    const subcommand = subcommands[name];
    if (subcommand === undefined) {
      throw new Error(`Unknown subcommand: ${name}`);
    }
    try {
      return await subcommand(reader, input);
    } catch (error) {
      console.error(`Error running subcommand ${name}:`, error);
      throw error;
    }
  };
}

export type Command<Input, Output> = (
  reader: Reader,
  input: Input,
) => Promise<Output>;

export async function run<Input, Output>(
  args: string[],
  input: Input,
  command: Command<Input, Output>,
): Promise<Output> {
  console.log("args:", args);
  console.log("input:", input);
  const reader = new Reader(
    new Map([["my-flag", true]]),
    new Map([["my-option", "value"]]),
    ["5", "6"],
  );
  return await command(reader, input);
}
