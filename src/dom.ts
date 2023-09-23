import {CellState, Const, Position} from "./game"
import {State} from "./state"

export enum Animation {
  AbsorbBottomShock = "absorb-bottom-shock",
  LimitedShockLeft = "limited-shock-left",
  LimitedShockRight = "limited-shock-right",
}

export function createBoardCells() {
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

export function updateCellElement(
  position: Position,
  state: CellState,
) {
  const $cell = getCellElement(position)

  $cell.dataset[Const.CELL_HTML_DATASET_STATE_KEY] = state

  if (state !== CellState.Empty)
    $cell.classList.add(state)
  else
    $cell.classList.remove(...Object.values(CellState))
}

function getCellElement(position: Position): HTMLElement {
  const $cell = document.querySelector<HTMLElement>(`[data-row="${position.row}"][data-col="${position.col}"]`)

  if ($cell === null)
    throw new Error(`cell at (${position.row}, ${position.col}) not found`)

  return $cell
}

export function playAnimation(
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

export function render(state: State) {
  // REVISE: Render step should be using `requestAnimationFrame`, while the game loop (ticks) should be using `setInterval`. By doing this, inputs from the player will be immediately reflected in the next FRAME, and not in the next TICK. This will make the game feel more responsive. Or perhaps, simply re-render immediately after an input is received.

  state.board.iter((position, state) => updateCellElement(position, state))
}
