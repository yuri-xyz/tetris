import {CellState, Const, Position} from "./game"

export function $createBoardCells() {
  const $cells = []

  for (let row = 0; row < Const.BOARD_ROWS; row++)
    for (let col = 0; col < Const.BOARD_COLS; col++) {
      const $cell = document.createElement("div")

      $cell.classList.add(Const.CELL_CLASS)
      $cell.dataset.row = row.toString()
      $cell.dataset.col = col.toString()
      $cell.dataset[Const.CELL_HTML_DATASET_STATE_KEY] = CellState.Empty
      $cells.push($cell)
    }

  return $cells
}

export function $updateCellState(position: Position, state: CellState) {
  $getCell(position).dataset[Const.CELL_HTML_DATASET_STATE_KEY] = state
}

function $getCell(position: Position): HTMLElement {
  const $cell = document.querySelector<HTMLElement>(`[data-row="${position.row}"][data-col="${position.col}"]`)

  if ($cell === null)
    throw new Error(`cell at (${position.row}, ${position.col}) not found`)

  return $cell
}
