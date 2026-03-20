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
 * Usage: <cliName> [breadcrumbs...]
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
 *   -s, --long <LABEL>  <description> (<hint>)
 *
 * ```
 * Sections that have no entries are omitted. The trailing empty line is always included.
 *
 * Column alignment within each section is handled by {@link TypoGrid}: the widest entry
 * in each column sets the width for the entire section.
 *
 * @param params.cliName - The CLI program name shown at the start of the usage line.
 * @param params.commandUsage - The usage model produced by
 *   {@link CommandFactory.generateUsage}.
 * @param params.typoSupport - Controls color/styling of the output.
 * @returns An ordered array of strings, one per output line (including a trailing
 *   empty string for the blank line at the end).
 *
 * @example
 * ```ts
 * const lines = usageToStyledLines({
 *   cliName: "my-cli",
 *   commandUsage: commandFactory.generateUsage(),
 *   typoSupport: TypoSupport.none(),
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

  const breadcrumbs = [
    textUsageHero("Usage:").computeStyledString(typoSupport),
    textConstants(cliName).computeStyledString(typoSupport),
  ].concat(
    commandUsage.breadcrumbs.map((breadcrumb) => {
      if ("positional" in breadcrumb) {
        return textUserInput(breadcrumb.positional).computeStyledString(
          typoSupport,
        );
      }
      if ("command" in breadcrumb) {
        return textConstants(breadcrumb.command).computeStyledString(
          typoSupport,
        );
      }
      throw new Error(`Unknown breadcrumb: ${JSON.stringify(breadcrumb)}`);
    }),
  );
  lines.push(breadcrumbs.join(" "));

  lines.push("");
  const introText = new TypoText();
  introText.pushString(textUsageText(commandUsage.information.description));
  if (commandUsage.information.hint) {
    introText.pushString(textDelimiter(" "));
    introText.pushString(textSubtleInfo(`(${commandUsage.information.hint})`));
  }
  lines.push(introText.computeStyledString(typoSupport));

  for (const detail of commandUsage.information.details ?? []) {
    const detailText = new TypoText();
    detailText.pushString(textSubtleInfo(detail));
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
    lines.push(
      ...typoGrid.computeStyledGrid(typoSupport).map((row) => row.join("")),
    );
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
    lines.push(
      ...typoGrid.computeStyledGrid(typoSupport).map((row) => row.join("")),
    );
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
      if (optionUsage.label) {
        typoGridRow.push(
          new TypoText(
            textConstants(`--${optionUsage.long}`),
            textDelimiter(" "),
            textUserInput(optionUsage.label),
          ),
        );
      } else {
        typoGridRow.push(
          new TypoText(
            textConstants(`--${optionUsage.long}`),
            textSubtleInfo("[=no]"),
          ),
        );
      }
      typoGridRow.push(...createInformationals(optionUsage));
      typoGrid.pushRow(typoGridRow);
    }
    lines.push(
      ...typoGrid.computeStyledGrid(typoSupport).map((row) => row.join("")),
    );
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
