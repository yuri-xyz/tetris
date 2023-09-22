import {$createBoardCells, $updateCellState} from "./dom"
import Matrix from "./matrix"
import Tetromino from "./tetromino"

export const Const = {
  BOARD_SELECTOR: "#board",
  CELL_CLASS: "cell",
  BOARD_COLS: 10,
  BOARD_ROWS: 20,
  CELL_HTML_DATASET_STATE_KEY: "tag",
  TICK_INTERVAL: 700,
}

export type Position = {
  row: number
  col: number
}

export enum CellState {
  Empty = "empty",
  Filled = "filled",
}

type State = {
  board: Matrix
  fallingTetrominoCells: Position[]
}

export function assert(condition: boolean, reasoning: string): asserts condition {
  if (!condition)
    throw new Error(`assertion failed: ${reasoning}`)
}

function tick(state: State) {
  // Shift falling tetromino down by one row.
  if (state.fallingTetrominoCells !== null)
    for (const fallingCell of state.fallingTetrominoCells) {
      const nextBoard = state.board.set(fallingCell, CellState.Empty)

      fallingCell.row += 1
      state.board = nextBoard.set(fallingCell, CellState.Filled)
    }

  // Render.
  state.board.iter((position, state) => $updateCellState(position, state))

  console.log("tick")
}

window.addEventListener("load", () => {
  console.log("Logic loaded")

  const $board = document.querySelector(Const.BOARD_SELECTOR)!

  $createBoardCells().forEach($cell => $board.appendChild($cell))
  console.log(`Initialized HTML board (${Const.BOARD_COLS}x${Const.BOARD_ROWS})`)

  const state: State = {
    board: new Matrix(Const.BOARD_ROWS, Const.BOARD_COLS),
    fallingTetrominoCells: Tetromino.square.toFilledPositionList(),
  }

  // Start game loop.
  setInterval(() => tick(state), Const.TICK_INTERVAL)
})
