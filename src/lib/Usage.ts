import { CommandUsage } from "./Command";
import { TypoGrid, TypoString, TypoSupport, TypoText } from "./Typo";

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
      if ("parameter" in breadcrumb) {
        return textUserInput(breadcrumb.parameter).computeStyledString(
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

  if (commandUsage.parameters.length > 0) {
    lines.push("");
    lines.push(textBlockTitle("Parameters:").computeStyledString(typoSupport));
    const typoGrid = new TypoGrid();
    for (const parameterUsage of commandUsage.parameters) {
      const typoGridRow = new Array<TypoText>();
      typoGridRow.push(new TypoText(textDelimiter()));
      typoGridRow.push(new TypoText(textUserInput(parameterUsage.label)));
      if (parameterUsage.description) {
        typoGridRow.push(new TypoText(textDelimiter()));
        typoGridRow.push(
          new TypoText(textUsefulInfo(parameterUsage.description)),
        );
      }
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
    for (const subcommand of commandUsage.subcommands) {
      const typoGridRow = new Array<TypoText>();
      typoGridRow.push(new TypoText(textDelimiter()));
      typoGridRow.push(new TypoText(textConstants(subcommand.name)));
      if (subcommand.description) {
        typoGridRow.push(new TypoText(textDelimiter()));
        typoGridRow.push(new TypoText(textUsefulInfo(subcommand.description)));
      }
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
      typoGridRow.push(new TypoText(textDelimiter()));
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
      if (optionUsage.description) {
        typoGridRow.push(new TypoText(textDelimiter()));
        typoGridRow.push(new TypoText(textUsefulInfo(optionUsage.description)));
      }
      typoGrid.pushRow(typoGridRow);
    }
    lines.push(
      ...typoGrid.computeStyledGrid(typoSupport).map((row) => row.join("")),
    );
  }

  lines.push("");
  return lines;
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
  return new TypoString(value, { fgColor: "darkCyan", bold: true });
}

function textUserInput(value: string): TypoString {
  return new TypoString(value, { fgColor: "darkBlue", bold: true });
}

function textDelimiter(value?: string): TypoString {
  return new TypoString(value ?? "  ");
}
