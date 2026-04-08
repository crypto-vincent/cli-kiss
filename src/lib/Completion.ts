/**
 * An option entry in a {@link CompletionNode}.
 */
export type CompletionOption = {
  /**
   * Long-form name (without `--`).
   */
  long: string;
  /**
   * Short-form name (without `-`), if any.
   */
  short?: string | undefined;
  /**
   * Whether this option consumes the next token as its value.
   */
  hasValue: boolean;
};

/**
 * A node in the completion tree, representing one level of the command hierarchy.
 * Produced by {@link Command.generateCompletionNode}.
 */
export type CompletionNode = {
  /**
   * Options available at this level.
   */
  options: Array<CompletionOption>;
  /**
   * Subcommands available at this level.
   */
  subcommands: { [name: string]: CompletionNode };
};

/**
 * Returns all possible completions at the position reached after the given completed args.
 * The caller (typically a shell completion script) is responsible for filtering the results
 * by the prefix of the current partial word.
 *
 * Returns an empty array when the cursor position is immediately after an option that expects
 * a value (e.g. `completedArgs = ["--output"]`), since the current word is that option's value,
 * not a new token.
 *
 * @param node - Root {@link CompletionNode} from {@link Command.generateCompletionNode}.
 * @param completedArgs - The args already typed on the command line, NOT including the
 *   current partial word being typed.
 * @returns All valid next tokens (subcommand names, `--long`, `-s` options), or `[]` when
 *   the cursor position is filling an option value.
 *
 * @example
 * ```ts
 * const node = rootCommand.generateCompletionNode();
 * const completions = getCompletions(node, ["sub"]);
 * // → ["--help", "--flag", "-v", ...]
 *
 * // Cursor is filling --output's value: no completions offered
 * getCompletions(node, ["--output"]); // → []
 * ```
 */
export function getCompletions(
  node: CompletionNode,
  completedArgs: ReadonlyArray<string>,
): Array<string> {
  const { node: currentNode, awaitingOptionValue } = walkCompletionNode(
    node,
    completedArgs,
  );
  if (awaitingOptionValue) {
    return [];
  }
  const completions: Array<string> = [];
  for (const name of Object.keys(currentNode.subcommands)) {
    completions.push(name);
  }
  for (const option of currentNode.options) {
    completions.push(`--${option.long}`);
    if (option.short !== undefined) {
      completions.push(`-${option.short}`);
    }
  }
  return completions;
}

/**
 * Generates a shell completion script for the given CLI.
 *
 * The script installs a completion function that calls `<cliName> --get-completions -- <args>`
 * at tab-completion time to fetch the list of possible completions dynamically.
 *
 * Supported shells: `"bash"`, `"zsh"`, `"fish"`.
 *
 * @param cliName - The CLI executable name (as registered in `PATH`).
 * @param shell - Target shell.
 * @returns The completion script as a string; print it and source/eval it in the shell.
 *
 * @example
 * ```bash
 * # Bash — add to ~/.bashrc or ~/.bash_profile:
 * source <(my-cli --completion bash)
 *
 * # Zsh — add to ~/.zshrc:
 * source <(my-cli --completion zsh)
 *
 * # Fish — add to ~/.config/fish/config.fish:
 * my-cli --completion fish | source
 * ```
 */
export function generateCompletionScript(
  cliName: string,
  shell: "bash" | "zsh" | "fish",
): string {
  switch (shell) {
    case "bash":
      return generateBashCompletionScript(cliName);
    case "zsh":
      return generateZshCompletionScript(cliName);
    case "fish":
      return generateFishCompletionScript(cliName);
  }
}

function generateBashCompletionScript(cliName: string): string {
  const fnName = `_${cliName.replace(/[^a-zA-Z0-9]/g, "_")}_completion`;
  return [
    `# ${cliName} bash completion`,
    `# Add to your shell: source <(${cliName} --completion bash)`,
    `${fnName}() {`,
    `  local IFS=$'\\n'`,
    `  COMPREPLY=($(compgen -W "$(${cliName} --get-completions -- "\${COMP_WORDS[@]:1:$((COMP_CWORD-1))}" 2>/dev/null)" -- "\${COMP_WORDS[$COMP_CWORD]}"))`,
    `}`,
    `complete -F ${fnName} ${cliName}`,
    ``,
  ].join("\n");
}

function generateZshCompletionScript(cliName: string): string {
  const fnName = `_${cliName.replace(/[^a-zA-Z0-9]/g, "_")}`;
  return [
    `#compdef ${cliName}`,
    `# ${cliName} zsh completion`,
    `# Add to your shell: source <(${cliName} --completion zsh)`,
    `${fnName}() {`,
    `  local -a completions`,
    `  completions=(\${(f)"\$(${cliName} --get-completions -- "\${words[2,$((CURRENT-1))]}" 2>/dev/null)"})`,
    `  compadd -- "\${completions[@]}"`,
    `}`,
    ``,
  ].join("\n");
}

function generateFishCompletionScript(cliName: string): string {
  const fnName = `__${cliName.replace(/[^a-zA-Z0-9]/g, "_")}_complete`;
  return [
    `# ${cliName} fish completion`,
    `# Add to your shell: ${cliName} --completion fish | source`,
    `function ${fnName}`,
    `  set -l tokens (commandline -opc)`,
    `  set -e tokens[1]`,
    `  ${cliName} --get-completions -- $tokens 2>/dev/null`,
    `end`,
    `complete -c ${cliName} -f -a '(${fnName})'`,
    ``,
  ].join("\n");
}

function walkCompletionNode(
  node: CompletionNode,
  args: ReadonlyArray<string>,
): { node: CompletionNode; awaitingOptionValue: boolean } {
  let currentNode = node;
  let i = 0;
  while (i < args.length) {
    const arg = args[i]!;
    if (arg === "--") {
      break;
    } else if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        i++;
      } else {
        const longName = arg.slice(2);
        const option = currentNode.options.find((o) => o.long === longName);
        if (option?.hasValue === true) {
          if (i + 1 < args.length) {
            i += 2;
          } else {
            return { node: currentNode, awaitingOptionValue: true };
          }
        } else {
          i++;
        }
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      const shortName = arg.slice(1);
      const option = currentNode.options.find((o) => o.short === shortName);
      if (option?.hasValue === true) {
        if (i + 1 < args.length) {
          i += 2;
        } else {
          return { node: currentNode, awaitingOptionValue: true };
        }
      } else {
        i++;
      }
    } else {
      if (currentNode.subcommands[arg] !== undefined) {
        currentNode = currentNode.subcommands[arg]!;
      }
      i++;
    }
  }
  return { node: currentNode, awaitingOptionValue: false };
}
