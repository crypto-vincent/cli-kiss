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
    typoPrintableString(typoSupport, textDescription(commandUsage.description)),
  );
  if (commandUsage.details) {
    for (const detailLine of commandUsage.details) {
      lines.push(typoPrintableString(typoSupport, textDetails(detailLine)));
    }
  }

  lines.push("");
  lines.push(typoPrintableString(typoSupport, textCategory("Usage:")));
  const breadcrumbs = [
    " ",
    typoPrintableString(typoSupport, textFixed(cliName)),
  ].concat(
    commandUsage.breadcrumbs.map((breadcrumb) => {
      if ("argument" in breadcrumb) {
        return typoPrintableString(typoSupport, textInput(breadcrumb.argument));
      }
      if ("command" in breadcrumb) {
        return typoPrintableString(typoSupport, textFixed(breadcrumb.command));
      }
      throw new Error(`Unknown breadcrumb: ${JSON.stringify(breadcrumb)}`);
    }),
  );
  lines.push(breadcrumbs.join(" "));

  if (commandUsage.arguments.length > 0) {
    lines.push("");
    lines.push(typoPrintableString(typoSupport, textCategory("Arguments:")));
    const grid = new Array<GridRow>();
    for (const argumentUsage of commandUsage.arguments) {
      const gridRow = new Array<GridCell>();
      gridRow.push([textDelimiter()]);
      gridRow.push([textInput(argumentUsage.label)]);
      if (argumentUsage.description) {
        gridRow.push([textDelimiter()]);
        gridRow.push([textDescription(argumentUsage.description)]);
      }
      grid.push(gridRow);
    }
    lines.push(...gridToPrintableLines(grid, typoSupport));
  }

  if (commandUsage.subcommands.length > 0) {
    lines.push("");
    lines.push(typoPrintableString(typoSupport, textCategory("Subcommands:")));
    const grid = new Array<GridRow>();
    for (const subcommand of commandUsage.subcommands) {
      const gridRow = new Array<GridCell>();
      gridRow.push([textDelimiter()]);
      gridRow.push([textFixed(subcommand.name)]);
      if (subcommand.description) {
        gridRow.push([textDelimiter()]);
        gridRow.push([textDescription(subcommand.description)]);
      }
      grid.push(gridRow);
    }
    lines.push(...gridToPrintableLines(grid, typoSupport));
  }

  if (commandUsage.options.length > 0) {
    lines.push("");
    lines.push(typoPrintableString(typoSupport, textCategory("Options:")));
    const grid = new Array<GridRow>();
    for (const optionUsage of commandUsage.options) {
      const gridRow = new Array<GridCell>();
      gridRow.push([textDelimiter()]);
      if (optionUsage.short) {
        gridRow.push([textFixed(`-${optionUsage.short}`), { value: ", " }]);
      } else {
        gridRow.push([]);
      }
      if (optionUsage.label) {
        gridRow.push([
          textFixed(`--${optionUsage.long} `),
          textInput(optionUsage.label),
        ]);
      } else {
        gridRow.push([textFixed(`--${optionUsage.long}`)]);
      }
      if (optionUsage.description) {
        gridRow.push([textDelimiter()]);
        gridRow.push([textDescription(optionUsage.description)]);
      }
      grid.push(gridRow);
    }
    lines.push(...gridToPrintableLines(grid, typoSupport));
  }

  lines.push("");
  return lines;
}

function textCategory(text: string): TypoText {
  return { value: text, color: "brightGreen", bold: true };
}

function textDescription(text: string): TypoText {
  return { value: text, bold: true };
}

function textDetails(text: string): TypoText {
  return { value: text, color: "brightBlack" };
}

function textFixed(text: string): TypoText {
  return { value: text, color: "brightCyan", bold: true };
}

function textInput(text: string): TypoText {
  return { value: text, color: "brightBlue" };
}

function textDelimiter(): TypoText {
  return { value: "  " };
}
