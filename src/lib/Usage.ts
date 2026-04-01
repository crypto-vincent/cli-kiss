import { CommandInformation } from "./Command";
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
 * Usage model. Produced by {@link CommandDecoder.generateUsage}, consumed by {@link usageToStyledLines}.
 */
export type UsageCommand = {
  /**
   * Segments of the usage line
   * (e.g. `my-cli <POSITIONAL> subcommand <ANOTHER_POSITIONAL>`).
   */
  segments: Array<UsageSegment>;
  /**
   * Command metadata.
   */
  information: CommandInformation;
  /**
   * Positionals in declaration order.
   */
  positionals: Array<UsagePositional>;
  /**
   * Subcommands, populated when none was selected.
   */
  subcommands: Array<UsageSubcommand>;
  /**
   * Options in registration order.
   */
  options: Array<UsageOption>;
};

/**
 * One segment of the usage line.
 */
export type UsageSegment = { positional: string } | { subcommand: string };

/**
 * Usage metadata. Produced by {@link Operation.generateUsage}, consumed when building {@link UsageCommand}.
 */
export type UsageOperation = {
  /**
   * Registered options.
   */
  options: Array<UsageOption>;
  /**
   * Declared positionals, in order.
   */
  positionals: Array<UsagePositional>;
};

/**
 * Positional metadata for the `Positionals:` section of help.
 */
export type UsagePositional = {
  /**
   * Help text.
   */
  description: string | undefined;
  /**
   * Short note shown in parentheses.
   */
  hint: string | undefined;
  /**
   * Placeholder label shown in the usage line and the `Positionals:` section.
   */
  label: string;
};

/**
 * Entry in the `Subcommands:` section.
 */
export type UsageSubcommand = {
  /**
   * Token the user types (e.g. `"deploy"`).
   */
  name: string;
  /**
   * From {@link CommandInformation.description}.
   */
  description: string | undefined;
  /**
   * From {@link CommandInformation.hint}.
   */
  hint: string | undefined;
};

/**
 * Option metadata for the `Options:` section of help.
 */
export type UsageOption = {
  /**
   * Short-form name without `-` (e.g. `"v"`).
   */
  short?: string | undefined;
  /**
   * Long-form name without `--` (e.g. `"verbose"`).
   */
  long: string;
  /**
   * Value placeholder in help (e.g. `"<FILE>"`).
   */
  label?: string | undefined;
  /**
   * Extra annotation appended to the option label in help.
   */
  annotation?: string | undefined;
  /**
   * Help text.
   */
  description: string | undefined;
  /**
   * Short note shown in parentheses.
   */
  hint: string | undefined;
};

/**
 * Converts a {@link UsageCommand} model into an array of styled lines ready to be
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
 * @param params.usage - From {@link CommandDecoder.generateUsage}.
 * @param params.typoSupport - Rendering mode.
 * @returns Styled lines; includes a trailing empty string.
 *
 * @example
 * ```ts
 * const lines = usageToStyledLines({
 *   cliName: "my-cli",
 *   usage: commandDecoder.generateUsage(),
 *   typoSupport: TypoSupport.tty(),
 * });
 * process.stdout.write(lines.join("\n"));
 * ```
 */
export function usageToStyledLines(params: {
  cliName: string;
  usage: UsageCommand;
  typoSupport: TypoSupport;
}) {
  const { cliName, usage, typoSupport } = params;

  const lines = new Array<string>();

  const segmentsText = new TypoText();
  segmentsText.push(textUsageHero("Usage:"));
  segmentsText.push(textDelimiter(" "));
  segmentsText.push(textConstants(cliName));
  for (const segment of usage.segments) {
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
  introText.push(textUsageText(usage.information.description));
  if (usage.information.hint) {
    introText.push(textDelimiter(" "));
    introText.push(textSubtleInfo(`(${usage.information.hint})`));
  }
  lines.push(introText.computeStyledString(typoSupport));
  for (const detail of usage.information.details ?? []) {
    const detailText = new TypoText();
    detailText.push(textSubtleInfo(detail));
    lines.push(detailText.computeStyledString(typoSupport));
  }

  if (usage.positionals.length > 0) {
    lines.push("");
    lines.push(textBlockTitle("Positionals:").computeStyledString(typoSupport));
    const typoGrid = new TypoGrid();
    for (const positionalUsage of usage.positionals) {
      const typoGridRow = new Array<TypoText>();
      typoGridRow.push(new TypoText(textDelimiter("  ")));
      typoGridRow.push(new TypoText(textUserInput(positionalUsage.label)));
      typoGridRow.push(...createInformationals(positionalUsage));
      typoGrid.pushRow(typoGridRow);
    }
    lines.push(...typoGrid.computeStyledLines(typoSupport));
  }

  if (usage.subcommands.length > 0) {
    lines.push("");
    lines.push(textBlockTitle("Subcommands:").computeStyledString(typoSupport));
    const typoGrid = new TypoGrid();
    for (const subcommandUsage of usage.subcommands) {
      const typoGridRow = new Array<TypoText>();
      typoGridRow.push(new TypoText(textDelimiter("  ")));
      typoGridRow.push(new TypoText(textConstants(subcommandUsage.name)));
      typoGridRow.push(...createInformationals(subcommandUsage));
      typoGrid.pushRow(typoGridRow);
    }
    lines.push(...typoGrid.computeStyledLines(typoSupport));
  }

  if (usage.options.length > 0) {
    lines.push("");
    lines.push(textBlockTitle("Options:").computeStyledString(typoSupport));
    const typoGrid = new TypoGrid();
    for (const optionUsage of usage.options) {
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

  if (usage.information.examples) {
    lines.push("");
    lines.push(textBlockTitle("Examples:").computeStyledString(typoSupport));
    for (const example of usage.information.examples) {
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
          if (option.inlined !== undefined) {
            commandLineText.push(textSubtleInfo("="));
            commandLineText.push(textUserInput(option.inlined));
          }
          if (option.separated !== undefined) {
            for (const separatedValue of option.separated) {
              commandLineText.push(textDelimiter(" "));
              commandLineText.push(textUserInput(separatedValue));
            }
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
