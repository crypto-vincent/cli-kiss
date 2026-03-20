import { CommandUsage } from "./Command";
import {
  TypoGrid,
  TypoString,
  typoStyleConstants,
  typoStyleUserInput,
  TypoSupport,
  TypoText,
} from "./Typo";

export function usageToStyledLines(params: {
  cliName: Lowercase<string>;
  commandUsage: CommandUsage;
  typoSupport: TypoSupport;
}) {
  const { cliName, commandUsage, typoSupport } = params;

  const lines = new Array<string>();

  // TODO - description stacking for subcommands ?
  lines.push(
    textOverview(commandUsage.metadata.description).computeStyledString(
      typoSupport,
    ),
  );
  if (commandUsage.metadata.details) {
    lines.push(
      textSubtleInfo(commandUsage.metadata.details).computeStyledString(
        typoSupport,
      ),
    );
  }

  lines.push("");
  const breadcrumbs = [
    textUsageTitle("Usage:").computeStyledString(typoSupport),
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

function textOverview(value: string): TypoString {
  return new TypoString(value, { bold: true });
}

function textUsefulInfo(value: string): TypoString {
  return new TypoString(value);
}

function textSubtleInfo(value: string): TypoString {
  return new TypoString(value, { italic: true, dim: true });
}

function textUsageTitle(value: string): TypoString {
  return new TypoString(value, { fgColor: "darkMagenta", bold: true });
}

function textBlockTitle(value: string): TypoString {
  return new TypoString(value, { fgColor: "darkGreen", bold: true });
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
