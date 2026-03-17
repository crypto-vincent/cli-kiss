import { CommandUsage } from "./Command";
import { GridCell, GridRow, gridToPrintableLines } from "./Grid";
import { TypoSupport, TypoText, typoPrintableString } from "./Typo";

export function usageToPrintableLines(params: {
  cliName: string;
  commandUsage: CommandUsage;
  typoSupport: TypoSupport;
}) {
  const { cliName, commandUsage, typoSupport } = params;

  const lines = new Array<string>();

  lines.push("");
  lines.push(typoPrintableString(typoSupport, textDesc(commandUsage.title)));
  if (commandUsage.description) {
    for (const descriptionLine of commandUsage.description) {
      lines.push(typoPrintableString(typoSupport, textSubs(descriptionLine)));
    }
  }

  const breadcrumbPrefix = typoPrintableString(
    typoSupport,
    textTitle("Usage:"),
  );
  const breadcrumbsItems = [
    typoPrintableString(typoSupport, textName(cliName)),
  ].concat(
    commandUsage.breadcrumbs.map((breadcrumb) => {
      if (breadcrumb.kind === "argument") {
        return typoPrintableString(typoSupport, textValue(breadcrumb.value));
      }
      return typoPrintableString(typoSupport, textName(breadcrumb.value));
    }),
  );
  lines.push("");
  lines.push(`${breadcrumbPrefix} ${breadcrumbsItems.join(" ")}`);

  if (commandUsage.arguments.length > 0) {
    lines.push("");
    lines.push(typoPrintableString(typoSupport, textTitle("Arguments:")));
    const grid = new Array<GridRow>();
    for (const argumentUsage of commandUsage.arguments) {
      const gridRow = new Array<GridCell>();
      gridRow.push([]);
      gridRow.push([textValue(argumentUsage.label)]);
      gridRow.push([]);
      if (argumentUsage.description) {
        gridRow.push([textDesc(argumentUsage.description)]);
      }
      grid.push(gridRow);
    }
    lines.push(...gridToPrintableLines(grid, typoSupport));
  }

  if (commandUsage.options.length > 0) {
    lines.push("");
    lines.push(typoPrintableString(typoSupport, textTitle("Options:")));
    const grid = new Array<GridRow>();
    for (const optionUsage of commandUsage.options) {
      const gridRow = new Array<GridCell>();
      gridRow.push([]);
      if (optionUsage.short) {
        gridRow.push([textName(`-${optionUsage.short}`), { value: "," }]);
      } else {
        gridRow.push([]);
      }
      if (optionUsage.label) {
        gridRow.push([
          textName(`--${optionUsage.long} `),
          textValue(optionUsage.label),
        ]);
      } else {
        gridRow.push([
          textName(`--${optionUsage.long}`),
          { value: "[=yes|no]", color: "grey" },
        ]);
      }
      gridRow.push([]);
      if (optionUsage.description) {
        gridRow.push([textDesc(optionUsage.description)]);
      }
      grid.push(gridRow);
    }
    lines.push(...gridToPrintableLines(grid, typoSupport));
  }

  if (commandUsage.subcommands.length > 0) {
    lines.push("");
    lines.push(typoPrintableString(typoSupport, textTitle("Subcommands:")));
    const grid = new Array<GridRow>();
    for (const subcommand of commandUsage.subcommands) {
      const gridRow = new Array<GridCell>();
      gridRow.push([]);
      gridRow.push([textName(subcommand.name)]);
      gridRow.push([]);
      if (subcommand.title) {
        gridRow.push([textDesc(subcommand.title)]);
      }
      grid.push(gridRow);
    }
    lines.push(...gridToPrintableLines(grid, typoSupport));
  }
  lines.push("");
  return lines;
}

function textTitle(text: string): TypoText {
  return { value: text, color: "green", bold: true };
}

function textSubs(text: string): TypoText {
  return { value: text, color: "grey" };
}

function textDesc(text: string): TypoText {
  return { value: text, bold: true };
}

function textName(text: string): TypoText {
  return { value: text, color: "cyan", bold: true };
}

function textValue(text: string): TypoText {
  return { value: text, color: "cyan" };
}
