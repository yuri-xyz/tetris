import {CellState, Const, Position} from "./game"
import {State} from "./state"
import * as util from "./util"

export enum Animation {
  AbsorbBottomShock = "absorb-bottom-shock",
  LimitedShockLeft = "limited-shock-left",
  LimitedShockRight = "limited-shock-right",
  ScoreAlert = "score-alert",
  StatHighlight = "stat-highlight",
  RowClear = "row-clear"
}

export enum Stat {
  Score = "score"
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

      if (Const.IS_DEBUG_MODE && Const.IS_DEBUG_COORDS_VISIBLE)
        $cell.innerText = `${row}:${col}`

      $cells.push($cell)
    }

  return $cells
}

export function updateCellElement(
  position: Position,
  state: CellState,
) {
  const $cell = getCellElement(position)

  // $cell.dataset[Const.CELL_HTML_DATASET_STATE_KEY] = state
  $cell.classList.remove(...Object.values(CellState))

  if (state !== CellState.Empty)
    $cell.classList.add(state)
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
  duration: number,
  delay: number = 0
): Promise<void> {
  return new Promise(resolve => {
    // Do not restart the same animation if it's already playing.
    if ($element.style.animationName === animation)
      return

    $element.style.animationTimingFunction = "ease"
    $element.style.animationDuration = `${duration}ms`
    $element.style.animationName = animation
    $element.style.animationDelay = `${delay}ms`
    $element.classList.add(animation)

    setTimeout(() => {
      $element.style.animationName = ""
      resolve()
    }, delay + duration)
  })
}

export function getStatElement(stat: Stat): HTMLElement {
  const element = document.getElementById(stat)!

  util.assert(element !== null, "stat elements should always exist")

  return element
}

export function updateStat(stat: Stat, value: string): void {
  getStatElement(stat).innerText = value
}

export function render(state: State): void {
  // REVISE: Render step should be using `requestAnimationFrame`, while the game loop (ticks) should be using `setInterval`. By doing this, inputs from the player will be immediately reflected in the next FRAME, and not in the next TICK. This will make the game feel more responsive. Or perhaps, simply re-render immediately after an input is received.

  updateStat(Stat.Score, state.score.toString())
  state.board.iter((position, state) => updateCellElement(position, state))
}
