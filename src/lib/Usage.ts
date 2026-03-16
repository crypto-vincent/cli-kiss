import { CommandUsage } from "./Command";

export function usageFormatter(
  cliName: string,
  commandUsage: CommandUsage,
): string {
  const lines = new Array<string>();
  if (commandUsage.description) {
    lines.push("");
    lines.push(commandUsage.description);
  }
  lines.push("");
  lines.push(`Usage: ${cliName} ${commandUsage.breadcrumbs.join(" ")}`);
  if (commandUsage.arguments.length > 0) {
    lines.push("");
    lines.push("Arguments:");
    lines.push("");
    const rows = new Array<Array<string>>();
    for (const argumentUsage of commandUsage.arguments) {
      const columns = new Array<string>();
      columns.push("");
      columns.push(argumentUsage.label);
      columns.push("");
      if (argumentUsage.description) {
        columns.push(argumentUsage.description);
      }
      rows.push(columns);
    }
    pushGrid(lines, rows);
  }
  if (commandUsage.options.length > 0) {
    lines.push("");
    lines.push("Options:");
    lines.push("");
    const rows = new Array<Array<string>>();
    for (const optionUsage of commandUsage.options) {
      const columns = new Array<string>();
      columns.push("");
      if (optionUsage.short) {
        columns.push(`-${optionUsage.short},`);
      } else {
        columns.push("");
      }
      if (optionUsage.label) {
        columns.push(`--${optionUsage.long} ${optionUsage.label}`);
      } else {
        columns.push(`--${optionUsage.long}`);
      }
      columns.push("");
      if (optionUsage.description) {
        columns.push(optionUsage.description);
      }
      rows.push(columns);
    }
    pushGrid(lines, rows);
  }
  if (commandUsage.subcommands.length > 0) {
    lines.push("");
    lines.push("Subcommands:");
    lines.push("");
    const rows = new Array<Array<string>>();
    for (const subcommand of commandUsage.subcommands) {
      const columns = new Array<string>();
      columns.push("");
      columns.push(subcommand.name);
      columns.push("");
      if (subcommand.description) {
        columns.push(subcommand.description);
      }
      rows.push(columns);
    }
    pushGrid(lines, rows);
  }
  lines.push("");
  return lines.join("\n");
}

function pushGrid(lines: Array<string>, rows: Array<Array<string>>) {
  const widths = new Array<number>();
  for (const row of rows) {
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      const cell = row[columnIndex]!;
      if (
        widths[columnIndex] === undefined ||
        cell.length > widths[columnIndex]!
      ) {
        widths[columnIndex] = cell.length;
      }
    }
  }
  for (const row of rows) {
    const cells = new Array<string>();
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      const cell = row[columnIndex]!;
      if (columnIndex < row.length - 1) {
        const padding = " ".repeat(widths[columnIndex]! - cell.length);
        cells.push(cell + padding);
      } else {
        cells.push(cell);
      }
    }
    lines.push(cells.join(" "));
  }
}
