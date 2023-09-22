import {$createBoardCells, $updateCellState} from "./dom"
import Matrix from "./matrix"
import Tetromino from "./tetromino"

export const Const = {
  BOARD_SELECTOR: "#board",
  CELL_CLASS: "cell",
  BOARD_COLS: 10,
  BOARD_ROWS: 20,
  CELL_HTML_DATASET_STATE_KEY: "tag",
  TICK_INTERVAL: 200,
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
  tetromino: Matrix
  tetrominoPosition: Position
}

function calculateMiddleCol(cols: number, tetrominoCols: number): number {
  const middleCol = Math.floor(cols / 2)
  const tetrominoMiddleCol = Math.floor(tetrominoCols / 2)

  return middleCol - tetrominoMiddleCol
}

function tick(previousState: State): State {
  const state = {
    board: previousState.board.clone(),
    tetromino: previousState.tetromino.clone(),
    tetrominoPosition: {...previousState.tetrominoPosition},
  }

  // Shift falling tetromino down by one row.
  state.board = state.board.clear(state.tetromino, state.tetrominoPosition)
  state.tetrominoPosition.row += 1
  state.board = state.board.insert(state.tetromino, state.tetrominoPosition)

  const tetrominoBottomRow = state.tetrominoPosition.row + state.tetromino.rows - 1

  // If the tetromino has reached the bottom of the board,
  // lock it in place, and spawn a new tetromino.
  if (tetrominoBottomRow === state.board.rows - 1) {
    // state.board = state.board.insert(state.tetromino, state.tetrominoPosition)
    state.tetromino = Tetromino.random

    state.tetrominoPosition = {
      row: 0,
      col: calculateMiddleCol(state.board.cols, state.tetromino.cols)
    }
  }

  return state
}

window.addEventListener("load", () => {
  console.log("Game logic loaded")

  const $board = document.querySelector(Const.BOARD_SELECTOR)!

  $createBoardCells().forEach($cell => $board.appendChild($cell))
  console.log(`Initialized HTML board (${Const.BOARD_COLS}x${Const.BOARD_ROWS})`)

  const initialTetromino = Tetromino.random
  const middleCol = calculateMiddleCol(Const.BOARD_COLS, initialTetromino.cols)

  let state: State = {
    board: new Matrix(Const.BOARD_ROWS, Const.BOARD_COLS),
    tetromino: initialTetromino,
    tetrominoPosition: {row: 0, col: middleCol},
  }

  // REVISE: Render step should be using `requestAnimationFrame`, while the game loop (ticks) should be using `setInterval`. By doing this, inputs from the player will be immediately reflected in the next FRAME, and not in the next TICK. This will make the game feel more responsive. Or perhaps, simply re-render immediately after an input is received.
  const render = (state: State) =>
    state.board.iter((position, state) => $updateCellState(position, state))

  $board.addEventListener("click", event => {
    event.preventDefault()

    // FIXME: Why is a clear required here? Without it, the tetromino is not FULLY cleared (ie. some cells are still filled).
    state.board = state.board.clear(state.tetromino, state.tetrominoPosition)

    if (state.tetromino)
      state.tetromino = state.tetromino.rotateClockwise()

    state.board = state.board.insert(state.tetromino, state.tetrominoPosition)
    render(state)
  })

  $board.addEventListener("contextmenu", event => {
    event.preventDefault()

    // FIXME: Why is a clear required here? Without it, the tetromino is not FULLY cleared (ie. some cells are still filled).
    state.board = state.board.clear(state.tetromino, state.tetrominoPosition)

    if (state.tetromino)
      state.tetromino = state.tetromino.rotateClockwise()

    state.board = state.board.insert(state.tetromino, state.tetrominoPosition)
    render(state)
  })

  window.addEventListener("keyup", event => {
    // TODO: Handle out of bounds. Simply ignore if it would go out of bounds (use a `constrain` helper function).

    // FIXME: Why is a clear required here? Without it, the tetromino is not FULLY cleared (ie. some cells are still filled).
    state.board = state.board.clear(state.tetromino, state.tetrominoPosition)

    if (event.key === "ArrowLeft")
      state.tetrominoPosition.col -= 1
    else if (event.key === "ArrowRight")
      state.tetrominoPosition.col += 1
    else if (event.key === "ArrowDown")
      state.tetrominoPosition.row += 1

    state.board = state.board.insert(state.tetromino, state.tetrominoPosition)
    render(state)
  })

  // Initial render.
  state.board = state.board.insert(state.tetromino, state.tetrominoPosition)
  render(state)
  console.log("Initial render")

  // Start game loop.
  setInterval(() => {
    state = tick(state)
    render(state)
    console.log("tick")
  }, Const.TICK_INTERVAL)
})
