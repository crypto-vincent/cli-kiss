import { TypoSupport, TypoText, typoPrintableString } from "./Typo";

export type Grid = Array<GridRow>;
export type GridRow = Array<GridCell>;
export type GridCell = Array<TypoText>;

export function gridToPrintableLines(
  grid: Grid,
  typoSupport: TypoSupport,
  delimiter: string = "",
): Array<string> {
  const lines = new Array<string>();
  const gridWidths = new Array<number>();
  for (const gridRow of grid) {
    for (
      let gridColumnIndex = 0;
      gridColumnIndex < gridRow.length;
      gridColumnIndex++
    ) {
      const gridCell = gridRow[gridColumnIndex]!;
      const length = gridCellLength(gridCell);
      if (
        gridWidths[gridColumnIndex] === undefined ||
        length > gridWidths[gridColumnIndex]!
      ) {
        gridWidths[gridColumnIndex] = length;
      }
    }
  }
  for (const gridRow of grid) {
    const lineColumns = new Array<string>();
    for (
      let gridColumnIndex = 0;
      gridColumnIndex < gridRow.length;
      gridColumnIndex++
    ) {
      const gridCell = gridRow[gridColumnIndex]!;
      const parts = gridCell.map((text) =>
        typoPrintableString(typoSupport, text),
      );
      if (gridColumnIndex < gridRow.length - 1) {
        const length = gridCellLength(gridCell);
        const padding = " ".repeat(gridWidths[gridColumnIndex]! - length);
        lineColumns.push(parts.join("") + padding);
      } else {
        lineColumns.push(parts.join(""));
      }
    }
    lines.push(lineColumns.join(delimiter));
  }
  return lines;
}

function gridCellLength(cell: GridCell): number {
  let length = 0;
  for (const text of cell) {
    length += text.value.length;
  }
  return length;
}
