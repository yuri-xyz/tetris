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

export enum TetrominoUpdate {
  Recompute,
  PlaceInPlace,
  PlaceIntoProjection
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

export function createProjectionTetromino(tetromino: Matrix): Matrix {
  return tetromino.transform((_position, state) => {
    if (state === CellState.Empty)
      return state

    return CellState.Projection
  })
}

export function updateTetrominoState(state: State, update: TetrominoUpdate): State {
  const nextTetromino = update === TetrominoUpdate.Recompute
    ? state.tetromino
    : Tetromino.random

  // This is the position where new tetrominos enter the board.
  const entryPosition: Position = {
    row: 0,
    col: calculateMiddleCol(state.board.cols, nextTetromino.cols)
  }

  const nextPosition: Position = update === TetrominoUpdate.Recompute
    ? state.tetrominoPosition
    : entryPosition

  const nextProjectionPosition2: Position = {
    // FIXME: Cannot base off the old board.
    row: project(state.board, nextTetromino, nextPosition),
    col: nextPosition.col,
  }

  let nextBoard = state.board
    // Clear old tetromino.
    .clearMask(state.tetromino, state.tetrominoPosition)
    // Clear old projection.
    .clearMask(state.tetromino, state.projectionPosition)
    // Insert the new projection.
    .insert(createProjectionTetromino(nextTetromino), nextProjectionPosition2)
    // Update or insert the new tetromino.
    .insert(nextTetromino, nextPosition)

  const nextProjectionPosition: Position = {
    row: project(nextBoard, nextTetromino, nextPosition),
    col: nextPosition.col,
  }

  return state.update({
    board: nextBoard,
    tetromino: nextTetromino,
    tetrominoPosition: nextPosition,
    projectionPosition: nextProjectionPosition
  })
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

export function couldMove(
  delta: Position,
  board: Matrix,
  tetromino: Matrix,
  tetrominoPosition: Position
): boolean {
  return wouldCollide(board, tetromino, tetrominoPosition, delta)
    === CollisionCheckResult.NoCollision
}

export function project(
  board: Matrix,
  tetromino: Matrix,
  tetrominoPosition: Position
): number {
  const projectionPosition = {...tetrominoPosition}

  // Move as far down as possible.
  while (couldMove({row: 1, col: 0}, board, tetromino, projectionPosition))
    projectionPosition.row += 1

  return projectionPosition.row
}

function createInitialState(): State {
  const initialTetromino = Tetromino.random
  const middleCol = calculateMiddleCol(Const.BOARD_COLS, initialTetromino.cols)
  const initialTetrominoPosition: Position = {row: 0, col: middleCol}

  const initialProjectionPosition: Position = {
    row: Const.BOARD_ROWS - initialTetromino.rows,
    col: middleCol
  }

  // REVISE: Avoid using `insert`, instead prefer `createNextTetrominoState`.
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
      case "ArrowLeft": nextState = state.choose(playerEvents.onPlayerHorizontalShiftInput(state, -1)); break
      case "ArrowRight": nextState = state.choose(playerEvents.onPlayerHorizontalShiftInput(state, 1)); break
      case "ArrowUp": nextState = state.choose(playerEvents.onPlayerRotateInput(state)); break
      case " ": nextState = state.choose(playerEvents.onPlayerPlacementInput(state)); break
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
