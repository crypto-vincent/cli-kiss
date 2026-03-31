import { CommandUsage } from "./Command";
import {
  TypoGrid,
  TypoString,
  typoStyleConstants,
  typoStyleLogic,
  typoStyleRegularStrong,
  typoStyleRegularWeaker,
  typoStyleTitle,
  typoStyleUserInput,
  TypoSupport,
  TypoText,
} from "./Typo";

/**
 * Converts a {@link CommandUsage} model into an array of styled lines ready to be
 * joined with `"\n"` and printed to the terminal.
 *
 * The output format is:
 * ```
 * Usage: <cliName> [segments...]
 *
 * <description> (<hint>)
 * <detail lines...>
 *
 * Positionals:
 *   <LABEL>  <description> (<hint>)
 *
 * Subcommands:
 *   <name>  <description> (<hint>)
 *
 * Options:
 *   -s, --long <LABEL><annotation>  <description> (<hint>)
 *
 * Examples:
 *   <description>
 *   <command line>
 *
 * ```
 * Sections that have no entries are omitted. The trailing empty line is always included.
 *
 * Column alignment per section via {@link TypoGrid}.
 *
 * @param params.cliName - Program name for the usage line.
 * @param params.commandUsage - From {@link CommandDecoder.generateUsage}.
 * @param params.typoSupport - Rendering mode.
 * @returns Styled lines; includes a trailing empty string.
 *
 * @example
 * ```ts
 * const lines = usageToStyledLines({
 *   cliName: "my-cli",
 *   commandUsage: commandDecoder.generateUsage(),
 *   typoSupport: TypoSupport.tty(),
 * });
 * process.stdout.write(lines.join("\n"));
 * ```
 */
export function usageToStyledLines(params: {
  cliName: Lowercase<string>;
  commandUsage: CommandUsage;
  typoSupport: TypoSupport;
}) {
  const { cliName, commandUsage, typoSupport } = params;

  const lines = new Array<string>();

  const segmentsText = new TypoText();
  segmentsText.push(textUsageHero("Usage:"));
  segmentsText.push(textDelimiter(" "));
  segmentsText.push(textConstants(cliName));
  for (const segment of commandUsage.segments) {
    segmentsText.push(textDelimiter(" "));
    if ("positional" in segment) {
      segmentsText.push(textUserInput(segment.positional));
    }
    if ("subcommand" in segment) {
      segmentsText.push(textConstants(segment.subcommand));
    }
  }
  lines.push(segmentsText.computeStyledString(typoSupport));

  lines.push("");
  const introText = new TypoText();
  introText.push(textUsageText(commandUsage.information.description));
  if (commandUsage.information.hint) {
    introText.push(textDelimiter(" "));
    introText.push(textSubtleInfo(`(${commandUsage.information.hint})`));
  }
  lines.push(introText.computeStyledString(typoSupport));
  for (const detail of commandUsage.information.details ?? []) {
    const detailText = new TypoText();
    detailText.push(textSubtleInfo(detail));
    lines.push(detailText.computeStyledString(typoSupport));
  }

  if (commandUsage.positionals.length > 0) {
    lines.push("");
    lines.push(textBlockTitle("Positionals:").computeStyledString(typoSupport));
    const typoGrid = new TypoGrid();
    for (const positionalUsage of commandUsage.positionals) {
      const typoGridRow = new Array<TypoText>();
      typoGridRow.push(new TypoText(textDelimiter("  ")));
      typoGridRow.push(new TypoText(textUserInput(positionalUsage.label)));
      typoGridRow.push(...createInformationals(positionalUsage));
      typoGrid.pushRow(typoGridRow);
    }
    lines.push(...typoGrid.computeStyledLines(typoSupport));
  }

  if (commandUsage.subcommands.length > 0) {
    lines.push("");
    lines.push(textBlockTitle("Subcommands:").computeStyledString(typoSupport));
    const typoGrid = new TypoGrid();
    for (const subcommandUsage of commandUsage.subcommands) {
      const typoGridRow = new Array<TypoText>();
      typoGridRow.push(new TypoText(textDelimiter("  ")));
      typoGridRow.push(new TypoText(textConstants(subcommandUsage.name)));
      typoGridRow.push(...createInformationals(subcommandUsage));
      typoGrid.pushRow(typoGridRow);
    }
    lines.push(...typoGrid.computeStyledLines(typoSupport));
  }

  if (commandUsage.options.length > 0) {
    lines.push("");
    lines.push(textBlockTitle("Options:").computeStyledString(typoSupport));
    const typoGrid = new TypoGrid();
    for (const optionUsage of commandUsage.options) {
      const typoGridRow = new Array<TypoText>();
      typoGridRow.push(new TypoText(textDelimiter("  ")));
      if (optionUsage.short) {
        typoGridRow.push(
          new TypoText(
            textConstants(`-${optionUsage.short}`),
            textDelimiter(", "),
          ),
        );
      } else {
        typoGridRow.push(new TypoText());
      }
      const longOptionText = new TypoText(
        textConstants(`--${optionUsage.long}`),
      );
      if (optionUsage.label) {
        longOptionText.push(textDelimiter(" "));
        longOptionText.push(textUserInput(optionUsage.label));
      }
      if (optionUsage.annotation) {
        longOptionText.push(textSubtleInfo(optionUsage.annotation));
      }
      typoGridRow.push(longOptionText);
      typoGridRow.push(...createInformationals(optionUsage));
      typoGrid.pushRow(typoGridRow);
    }
    lines.push(...typoGrid.computeStyledLines(typoSupport));
  }

  if (commandUsage.information.examples) {
    lines.push("");
    lines.push(textBlockTitle("Examples:").computeStyledString(typoSupport));
    for (const example of commandUsage.information.examples) {
      const exampleExplanationText = new TypoText();
      exampleExplanationText.push(textDelimiter(" "));
      exampleExplanationText.push(textSubtleInfo(`# ${example.explanation}`));
      lines.push(exampleExplanationText.computeStyledString(typoSupport));
      const commandLineText = new TypoText();
      commandLineText.push(textDelimiter(" "));
      commandLineText.push(textConstants(cliName));
      for (const commandArg of example.commandArgs) {
        commandLineText.push(textDelimiter(" "));
        if (typeof commandArg === "string") {
          commandLineText.push(commandArg);
        } else if ("positional" in commandArg) {
          commandLineText.push(textUserInput(commandArg.positional));
        } else if ("subcommand" in commandArg) {
          commandLineText.push(textConstants(commandArg.subcommand));
        } else if ("option" in commandArg) {
          const option = commandArg.option;
          if ("short" in option) {
            commandLineText.push(textConstants(`-${option.short}`));
          } else {
            commandLineText.push(textConstants(`--${option.long}`));
          }
          if (option.value !== undefined) {
            commandLineText.push(textSubtleInfo("="));
            commandLineText.push(textUserInput(option.value));
          }
        }
      }
      lines.push(commandLineText.computeStyledString(typoSupport));
    }
  }

  lines.push("");
  return lines;
}

function createInformationals(usage: {
  description: string | undefined;
  hint: string | undefined;
}): Array<TypoText> {
  const informationals = [];
  if (usage.description) {
    informationals.push(textDelimiter(" "));
    informationals.push(textUsefulInfo(usage.description));
  }
  if (usage.hint) {
    informationals.push(textDelimiter(" "));
    informationals.push(textSubtleInfo(`(${usage.hint})`));
  }
  if (informationals.length > 0) {
    return [new TypoText(textDelimiter(" "), ...informationals)];
  }
  return [];
}

function textUsageHero(value: string): TypoString {
  return new TypoString(value, typoStyleLogic);
}

function textUsageText(value: string): TypoString {
  return new TypoString(value, typoStyleRegularStrong);
}

function textUsefulInfo(value: string): TypoString {
  return new TypoString(value);
}

function textBlockTitle(value: string): TypoString {
  return new TypoString(value, typoStyleTitle);
}

function textSubtleInfo(value: string): TypoString {
  return new TypoString(value, typoStyleRegularWeaker);
}

function textConstants(value: string): TypoString {
  return new TypoString(value, typoStyleConstants);
}

function textUserInput(value: string): TypoString {
  return new TypoString(value, typoStyleUserInput);
}

function textDelimiter(value: string): TypoString {
  return new TypoString(value);
}
