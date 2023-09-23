import * as dom from "./dom"
import * as effects from "./effects"
import Matrix from "./matrix"
import {State} from "./state"
import Tetromino from "./tetromino"
import * as playerEvents from "./playerEvents"
import * as gameEvents from "./gameEvents"

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
  Projection = "projection",
  Red = "red",
  Green = "green",
  LightGreen = "lightgreen",
  Pink = "pink",
  Orange = "orange",
  Yellow = "yellow",
  Purple = "purple",
}

export enum CollisionCheckResult {
  NoCollision,
  WallsOrFloorOrOtherTetromino,
  Ceiling,
}

export function updateTetromino(
  nextTetromino: Matrix,
  state: State,
  delta: Position = {row: 0, col: 0}
): State {
  const nextTetrominoPosition: Position = {
    row: state.tetrominoPosition.row + delta.row,
    col: state.tetrominoPosition.col + delta.col,
  }

  const nextProjectionPosition: Position = {
    row: project(state),
    col: nextTetrominoPosition.col,
  }

  const nextState = state.update({
    board: state.board
      .clearMask(state.tetromino, state.tetrominoPosition)
      .clearMask(state.tetromino, state.projectionPosition)
      .insert(createProjectionTetromino(nextTetromino), nextProjectionPosition)
      .insert(nextTetromino, nextTetrominoPosition),
    tetromino: nextTetromino,
    tetrominoPosition: nextTetrominoPosition,
    projectionPosition: nextProjectionPosition,
  })

  return nextState
}

export function createProjectionTetromino(tetromino: Matrix): Matrix {
  return tetromino.transform((_position, state) => {
    if (state === CellState.Empty)
      return state

    return CellState.Projection
  })
}

function chooseState(state: State, nextState: State | null): State {
  if (nextState === null)
    return state

  return nextState
}

export function calculateMiddleCol(cols: number, tetrominoCols: number): number {
  const middleCol = Math.floor(cols / 2)
  const tetrominoMiddleCol = Math.floor(tetrominoCols / 2)

  return middleCol - tetrominoMiddleCol
}

export function wouldCollide(
  board: Matrix,
  tetromino: Matrix,
  tetrominoPosition: Position,
  delta: Position = {row: 0, col: 0}
): CollisionCheckResult {
  // REVISE: Break this function down into smaller functions (e.g. `wouldCollideWithWalls`, `wouldCollideWithFloor`, `wouldCollideWithOtherTetromino`).

  // Remove the tetromino from the board, to prevent it from
  // colliding with itself.
  const virtualBoard = board.clearMask(tetromino, tetrominoPosition)

  const virtualPosition = {
    row: tetrominoPosition.row + delta.row,
    col: tetrominoPosition.col + delta.col,
  }

  // Check left and right columns.
  if (virtualPosition.col < 0 || virtualPosition.col + tetromino.cols > virtualBoard.cols)
    return CollisionCheckResult.WallsOrFloorOrOtherTetromino
  // Check bottom of the board.
  else if (virtualPosition.row + tetromino.rows > virtualBoard.rows)
    return CollisionCheckResult.WallsOrFloorOrOtherTetromino

  let collidedAgainstCell = false

  tetromino.iter(({row, col}, state) => {
    // Ignore empty or projection cells; they don't collide with anything.
    if (state === CellState.Empty || state === CellState.Projection)
      return

    const boardRow = row + virtualPosition.row
    const boardCol = col + virtualPosition.col
    const boardCell = virtualBoard.unwrap()[boardRow][boardCol]

    if (boardCell !== CellState.Empty && boardCell !== CellState.Projection)
      collidedAgainstCell = true
  })

  if (tetrominoPosition.row === 0 && collidedAgainstCell)
    return CollisionCheckResult.Ceiling

  return collidedAgainstCell
    ? CollisionCheckResult.WallsOrFloorOrOtherTetromino
    : CollisionCheckResult.NoCollision
}

export function couldMove(delta: Position, state: State): boolean {
  return wouldCollide(state.board, state.tetromino, state.tetrominoPosition, delta)
    === CollisionCheckResult.NoCollision
}

export function project(state: State): number {
  const projectionState = state.clone()

  // Move as far down as possible.
  while (couldMove({row: 1, col: 0}, projectionState))
    projectionState.tetrominoPosition.row += 1

  return projectionState.tetrominoPosition.row
}

function createInitialState(): State {
  const initialTetromino = Tetromino.random
  const middleCol = calculateMiddleCol(Const.BOARD_COLS, initialTetromino.cols)
  const initialTetrominoPosition: Position = {row: 0, col: middleCol}

  const initialProjectionPosition: Position = {
    row: Const.BOARD_ROWS - initialTetromino.rows,
    col: middleCol
  }

  const initialBoard = new Matrix(Const.BOARD_ROWS, Const.BOARD_COLS)
    .insert(createProjectionTetromino(initialTetromino), initialProjectionPosition)
    .insert(initialTetromino, initialTetrominoPosition)

  return new State(
    initialBoard,
    initialTetromino,
    initialTetrominoPosition,
    initialProjectionPosition
  )
}

window.addEventListener("load", () => {
  console.log("Game logic loaded")

  const $board = document.querySelector(Const.BOARD_SELECTOR)!

  dom.createBoardCells().forEach($cell => $board.appendChild($cell))
  console.log(`Initialized HTML board (${Const.BOARD_COLS}x${Const.BOARD_ROWS})`)

  let state = createInitialState()

  window.addEventListener("keydown", event => {
    let nextState = null

    // TODO: Handle out of bounds. Simply ignore if it would go out of bounds (use a `constrain` helper function).
    switch (event.key) {
      case "ArrowLeft": nextState = chooseState(state, playerEvents.onPlayerHorizontalShiftInput(state, -1)); break
      case "ArrowRight": nextState = chooseState(state, playerEvents.onPlayerHorizontalShiftInput(state, 1)); break
      case "ArrowUp": nextState = chooseState(state, playerEvents.onPlayerRotateInput(state)); break
      case " ": nextState = chooseState(state, playerEvents.onPlayerPlacementInput(state)); break
    }

    if (nextState !== null) {
      state = nextState
      dom.render(state)
    }
  })

  // Setup effects, animations, and audio.
  effects.playInitializationEffectSequence()

  // Initial render.
  dom.render(state)
  console.log("Initial render")

  // Start game loop.
  setInterval(() => {
    state = gameEvents.onFallTick(state)
    dom.render(state)
  }, Const.TICK_INTERVAL)
})
