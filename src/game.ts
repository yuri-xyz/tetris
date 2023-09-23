import * as dom from "./dom"
import {Animation} from "./dom"
import * as effects from "./effects"
import Matrix from "./matrix"
import Tetromino from "./tetromino"
import * as util from "./util"

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

enum CollisionCheckResult {
  NoCollision,
  WallsOrFloorOrOtherTetromino,
  Ceiling,
}

export type State = {
  board: Matrix
  tetromino: Matrix
  tetrominoPosition: Position
  projectionPosition: Position
}

function updateTetromino(
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

  const nextState = cloneState(state, {
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

function createProjectionTetromino(tetromino: Matrix): Matrix {
  return tetromino.transform((_position, state) => {
    if (state === CellState.Empty)
      return state

    return CellState.Projection
  })
}

function cloneState(state: State, changes?: Partial<State>): State {
  const result: State = {
    board: state.board.clone(),
    tetromino: state.tetromino.clone(),
    tetrominoPosition: {...state.tetrominoPosition},
    projectionPosition: {...state.projectionPosition},
  }

  if (changes !== undefined) {
    result.board = changes.board ?? result.board
    result.tetromino = changes.tetromino ?? result.tetromino
    result.tetrominoPosition = changes.tetrominoPosition ?? result.tetrominoPosition
  }

  return result
}

function chooseState(state: State, nextState: State | null): State {
  if (nextState === null)
    return state

  return nextState
}

function calculateMiddleCol(cols: number, tetrominoCols: number): number {
  const middleCol = Math.floor(cols / 2)
  const tetrominoMiddleCol = Math.floor(tetrominoCols / 2)

  return middleCol - tetrominoMiddleCol
}

function wouldCollide(
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

function couldMove(delta: Position, state: State): boolean {
  return wouldCollide(state.board, state.tetromino, state.tetrominoPosition, delta)
    === CollisionCheckResult.NoCollision
}

function project(state: State): number {
  const projectionState = cloneState(state)

  // Move as far down as possible.
  while (couldMove({row: 1, col: 0}, projectionState))
    projectionState.tetrominoPosition.row += 1

  return projectionState.tetrominoPosition.row
}

function fallTick(state: State): State {
  // REVISE: Break function down into smaller functions (e.g. `lockTetromino`, `updateTetrominoPosition`, `updateProjectionPosition`, `insertTetromino`, `insertProjection`).

  const collisionCheckResult = wouldCollide(
    state.board,
    state.tetromino,
    state.tetrominoPosition,
    {row: 1, col: 0}
  )

  // If there is no collision, update the tetromino position
  // by shifting it down by one row.
  if (collisionCheckResult === CollisionCheckResult.NoCollision)
    return updateTetromino(state.tetromino, state, {row: 1, col: 0})
  else if (collisionCheckResult === CollisionCheckResult.Ceiling) {
    alert("Game over!")
    window.location.reload()
  }

  // Otherwise, a collision occurred: lock the current tetromino,
  // and refresh to a new tetromino.

  const nextTetromino = Tetromino.random

  const nextProjectionPosition = {
    row: Const.BOARD_ROWS - nextTetromino.rows,
    col: calculateMiddleCol(state.board.cols, nextTetromino.cols)
  }

  const nextState: State = cloneState(state, {
    // By inserting the tetromino into the board, a clone is created,
    // and locked into place.
    board: state.board
      .insert(nextTetromino, state.tetrominoPosition)
      .insert(createProjectionTetromino(nextTetromino), nextProjectionPosition),
    // Reset the current tetromino, and position it at the top of the board.
    // Its projection position should also be updated.
    tetromino: nextTetromino,
    tetrominoPosition: {row: 0, col: calculateMiddleCol(state.board.cols, nextTetromino.cols)},
    projectionPosition: nextProjectionPosition,
  })

  effects.playPlacementEffectSequence()

  return nextState
}

function onRotate(state: State): State | null {
  const rotatedTetromino = state.tetromino.rotateClockwise()

  // BUG: The `wouldCollide` function clears the tetromino from the board to prevent self-collision. This is likely the cause of the rotation bug.
  const collisionCheck = wouldCollide(state.board, rotatedTetromino, state.tetrominoPosition)

  // Prevent the tetromino from rotating if it would collide with the walls or floor.
  if (collisionCheck !== CollisionCheckResult.NoCollision) {
    console.log("Denied rotation", collisionCheck)

    return null
  }

  return updateTetromino(rotatedTetromino, state)
}

function onHorizontalMove(state: State, deltaCol: number): State | null {
  const delta: Position = {row: 0, col: deltaCol}

  if (couldMove(delta, state))
    return updateTetromino(state.tetromino, state, delta)

  const disallowedAnimation: Animation = deltaCol < 0
    ? Animation.LimitedShockLeft
    : Animation.LimitedShockRight

  dom.playAnimation(document.querySelector(Const.BOARD_SELECTOR)!, disallowedAnimation, 300)

  return null
}

function onPlace(state: State): State | null {
  const nextTetromino = Tetromino.random

  const nextProjectionPosition: Position = {
    row: Const.BOARD_ROWS - nextTetromino.rows,
    col: calculateMiddleCol(state.board.cols, nextTetromino.cols)
  }

  const nextState = cloneState(state, {
    board: state.board
      .clearMask(state.tetromino, state.tetrominoPosition)
      .insert(state.tetromino, state.projectionPosition),
    tetromino: nextTetromino,
    tetrominoPosition: {row: 0, col: calculateMiddleCol(state.board.cols, nextTetromino.cols)},
    projectionPosition: nextProjectionPosition
  })

  effects.playPlacementEffectSequence()

  return nextState
}

function createInitialState(): State {
  const initialTetromino = Tetromino.random
  const middleCol = calculateMiddleCol(Const.BOARD_COLS, initialTetromino.cols)

  const state: State = {
    board: new Matrix(Const.BOARD_ROWS, Const.BOARD_COLS),
    tetromino: initialTetromino,
    tetrominoPosition: {row: 0, col: middleCol},
    projectionPosition: {row: Const.BOARD_ROWS - initialTetromino.rows, col: middleCol},
  }

  state.board = state.board
    .insert(createProjectionTetromino(state.tetromino), state.projectionPosition)
    .insert(state.tetromino, state.tetrominoPosition)

  return state
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
      case "ArrowLeft": nextState = chooseState(state, onHorizontalMove(state, -1)); break
      case "ArrowRight": nextState = chooseState(state, onHorizontalMove(state, 1)); break
      case "ArrowUp": nextState = chooseState(state, onRotate(state)); break
      case " ": nextState = chooseState(state, onPlace(state)); break
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
    state = fallTick(state)
    dom.render(state)
  }, Const.TICK_INTERVAL)
})
