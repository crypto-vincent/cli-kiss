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
        textSubtitle(commandUsage.metadata.details),
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
        gridRow.push([textInformative(argumentUsage.description)]);
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
        gridRow.push([textInformative(subcommand.description)]);
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
          textConstants(`--${optionUsage.long} `),
          textUserInput(optionUsage.label),
        ]);
      } else {
        gridRow.push([textConstants(`--${optionUsage.long}`)]);
      }
      if (optionUsage.description) {
        gridRow.push([textDelimiter()]);
        gridRow.push([textInformative(optionUsage.description)]);
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

function textSubtitle(value: string): TypoText {
  return { value, foregroundColor: "brightBlack", italic: true };
}

function textInformative(value: string): TypoText {
  return { value };
}

function textUsageTitle(value: string): TypoText {
  return { value, foregroundColor: "brightMagenta", bold: true };
}

function textBlockTitle(value: string): TypoText {
  return { value, foregroundColor: "brightGreen", bold: true };
}

function textConstants(value: string): TypoText {
  return { value, foregroundColor: "brightCyan", bold: true };
}

function textUserInput(value: string): TypoText {
  return { value, foregroundColor: "brightBlue", italic: true };
}

function textDelimiter(value?: string): TypoText {
  return { value: value ?? "  " };
}
