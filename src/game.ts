import {$createBoardCells, $updateCellState} from "./dom"
import Matrix from "./matrix"
import Tetromino from "./tetromino"

export const Const = {
  BOARD_SELECTOR: "#board",
  CELL_CLASS: "cell",
  BOARD_COLS: 10,
  BOARD_ROWS: 20,
  CELL_HTML_DATASET_STATE_KEY: "tag",
  TICK_INTERVAL: 1000,
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

function tick(state: State): State {
  const nextState = {
    board: state.board.clone(),
    tetromino: state.tetromino.clone(),
    tetrominoPosition: {...state.tetrominoPosition},
  }

  // Shift falling tetromino down by one row.
  nextState.board = nextState.board.clear(nextState.tetromino, nextState.tetrominoPosition)
  nextState.tetrominoPosition.row += 1
  nextState.board = nextState.board.insert(nextState.tetromino, nextState.tetrominoPosition)

  return nextState
}

window.addEventListener("load", () => {
  console.log("Game logic loaded")

  const $board = document.querySelector(Const.BOARD_SELECTOR)!

  $createBoardCells().forEach($cell => $board.appendChild($cell))
  console.log(`Initialized HTML board (${Const.BOARD_COLS}x${Const.BOARD_ROWS})`)

  const middleCol = Math.floor(Const.BOARD_COLS / 2)

  let state: State = {
    board: new Matrix(Const.BOARD_ROWS, Const.BOARD_COLS),
    tetromino: Tetromino.random,
    tetrominoPosition: {row: 0, col: middleCol},
  }

  $board.addEventListener("click", event => {
    event.preventDefault()

    if (state.tetromino)
      state.tetromino = state.tetromino.rotateClockwise()
  })

  $board.addEventListener("contextmenu", event => {
    event.preventDefault()

    if (state.tetromino)
      state.tetromino = state.tetromino.rotateClockwise()
  })

  const render = (state: State) =>
    state.board.iter((position, state) => $updateCellState(position, state))

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
