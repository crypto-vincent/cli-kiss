import { CommandUsage } from "./Command";
import { GridCell, GridRow, gridToPrintableLines } from "./Grid";
import { TypoSupport, TypoText, typoPrintableString } from "./Typo";

export function usageToPrintableLines(params: {
  cliName: Lowercase<string>;
  commandUsage: CommandUsage;
  typoSupport: TypoSupport;
}) {
  const { cliName, commandUsage, typoSupport } = params;

  const lines = new Array<string>();

  // TODO - description stacking for subcommands ?
  lines.push(
    typoPrintableString(
      typoSupport,
      textOverview(commandUsage.metadata.description),
    ),
  );
  if (commandUsage.metadata.details) {
    lines.push(
      typoPrintableString(
        typoSupport,
        textSubtleInfo(commandUsage.metadata.details),
      ),
    );
  }

  lines.push("");
  const breadcrumbs = [
    typoPrintableString(typoSupport, textUsageTitle("Usage:")),
    typoPrintableString(typoSupport, textConstants(cliName)),
  ].concat(
    commandUsage.breadcrumbs.map((breadcrumb) => {
      if ("argument" in breadcrumb) {
        return typoPrintableString(
          typoSupport,
          textUserInput(breadcrumb.argument),
        );
      }
      if ("command" in breadcrumb) {
        return typoPrintableString(
          typoSupport,
          textConstants(breadcrumb.command),
        );
      }
      throw new Error(`Unknown breadcrumb: ${JSON.stringify(breadcrumb)}`);
    }),
  );
  lines.push(breadcrumbs.join(" "));

  if (commandUsage.arguments.length > 0) {
    lines.push("");
    lines.push(typoPrintableString(typoSupport, textBlockTitle("Arguments:")));
    const grid = new Array<GridRow>();
    for (const argumentUsage of commandUsage.arguments) {
      const gridRow = new Array<GridCell>();
      gridRow.push([textDelimiter()]);
      gridRow.push([textUserInput(argumentUsage.label)]);
      if (argumentUsage.description) {
        gridRow.push([textDelimiter()]);
        gridRow.push([textUsefulInfo(argumentUsage.description)]);
      }
      grid.push(gridRow);
    }
    lines.push(...gridToPrintableLines(grid, typoSupport));
  }

  if (commandUsage.subcommands.length > 0) {
    lines.push("");
    lines.push(
      typoPrintableString(typoSupport, textBlockTitle("Subcommands:")),
    );
    const grid = new Array<GridRow>();
    for (const subcommand of commandUsage.subcommands) {
      const gridRow = new Array<GridCell>();
      gridRow.push([textDelimiter()]);
      gridRow.push([textConstants(subcommand.name)]);
      if (subcommand.description) {
        gridRow.push([textDelimiter()]);
        gridRow.push([textUsefulInfo(subcommand.description)]);
      }
      grid.push(gridRow);
    }
    lines.push(...gridToPrintableLines(grid, typoSupport));
  }

  if (commandUsage.options.length > 0) {
    lines.push("");
    lines.push(typoPrintableString(typoSupport, textBlockTitle("Options:")));
    const grid = new Array<GridRow>();
    for (const optionUsage of commandUsage.options) {
      const gridRow = new Array<GridCell>();
      gridRow.push([textDelimiter()]);
      if (optionUsage.short) {
        gridRow.push([
          textConstants(`-${optionUsage.short}`),
          textDelimiter(", "),
        ]);
      } else {
        gridRow.push([]);
      }
      if (optionUsage.label) {
        gridRow.push([
          textConstants(`--${optionUsage.long}`),
          textDelimiter(" "),
          textUserInput(optionUsage.label),
        ]);
      } else {
        gridRow.push([
          textConstants(`--${optionUsage.long}`),
          textSubtleInfo("[=no]"),
        ]);
      }
      if (optionUsage.description) {
        gridRow.push([textDelimiter()]);
        gridRow.push([textUsefulInfo(optionUsage.description)]);
      }
      grid.push(gridRow);
    }
    lines.push(...gridToPrintableLines(grid, typoSupport));
  }

  lines.push("");
  return lines;
}

function textOverview(value: string): TypoText {
  return { value, bold: true };
}

function textUsefulInfo(value: string): TypoText {
  return { value };
}

function textSubtleInfo(value: string): TypoText {
  return { value, italic: true, dim: true };
}

function textUsageTitle(value: string): TypoText {
  return { value, fgColor: "darkMagenta", bold: true };
}

function textBlockTitle(value: string): TypoText {
  return { value, fgColor: "darkGreen", bold: true };
}

function textConstants(value: string): TypoText {
  return { value, fgColor: "darkCyan", bold: true };
}

function textUserInput(value: string): TypoText {
  return { value, fgColor: "darkBlue", bold: true };
}

function textDelimiter(value?: string): TypoText {
  return { value: value ?? "  " };
}
