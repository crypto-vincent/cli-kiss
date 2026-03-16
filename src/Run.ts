import { Command } from "./Command";
import { Reader } from "./Reader";

/**
 * Parses `argv`, prepares the command, and runs it against the given
 * `context`.
 *
 * @remarks
 * This is the primary entry-point for executing a CLI application. Pass
 * `process.argv` (or a compatible array) as `argv`. The function creates a
 * {@link Reader}, invokes `command.prepare` to register all flags, options,
 * and positional argument readers, then calls the resulting runner with
 * `context`.
 *
 * @typeParam Context - Arbitrary application context forwarded to the command
 *   handler (e.g. a dependency-injection container or configuration object).
 * @typeParam Result - The value produced by the command handler.
 *
 * @param argv - The raw argument vector. Typically `process.argv`; must
 *   contain at least the Node.js executable path and the script path as the
 *   first two elements.
 * @param context - Arbitrary value passed through to the command handler.
 * @param command - The root {@link Command} to execute, created with one of
 *   the command factory functions.
 *
 * @returns A promise that resolves to the value returned by the command
 *   handler.
 *
 * @throws {Error} If `argv` has fewer than 2 elements.
 * @throws {Error} If the argv contains unrecognised flags, options, or extra
 *   positional arguments.
 *
 * @example
 * ```ts
 * const result = await runWithArgv(process.argv, appContext, rootCommand);
 * ```
 */
export async function runWithArgv<Context, Result>(
  argv: string[],
  context: Context,
  command: Command<Context, Result>,
): Promise<Result> {
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
