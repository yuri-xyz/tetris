import {CellState, Const, Position} from "./game"
import {chooseRandom} from "./util"

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

export function $updateCellState(
  position: Position,
  state: CellState,
) {
  const $cell = $getCell(position)

  $cell.dataset[Const.CELL_HTML_DATASET_STATE_KEY] = state

  if (state !== CellState.Empty)
    $cell.classList.add(state)
  else
    $cell.classList.remove(...Object.values(CellState))
}

function $getCell(position: Position): HTMLElement {
  const $cell = document.querySelector<HTMLElement>(`[data-row="${position.row}"][data-col="${position.col}"]`)

  if ($cell === null)
    throw new Error(`cell at (${position.row}, ${position.col}) not found`)

  return $cell
}

export enum Animation {
  AbsorbBottomShock = "absorb-bottom-shock",
  LimitedShockLeft = "limited-shock-left",
  LimitedShockRight = "limited-shock-right",
}

export function $playAnimation(
  $element: HTMLElement,
  animation: Animation,
  duration: number
): Promise<void> {
  return new Promise(resolve => {
    // Do not restart the same animation if it's already playing.
    if ($element.style.animationName === animation)
      return

    $element.style.animationTimingFunction = "ease-in-out"
    $element.style.animationDuration = `${duration}ms`
    $element.style.animationName = animation
    $element.classList.add(animation)

    setTimeout(() => {
      $element.style.animationName = ""
      resolve()
    }, duration)
  })
}
