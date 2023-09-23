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
  TICK_INTERVAL: 10_000,
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

function updateTetromino(nextTetromino: Matrix, delta: Position, state: State): State {
  const nextState = cloneState(state)

  // Remove the current tetromino from the board, along with
  // its projection, since its position will be updated.
  nextState.board = nextState.board
    .clearMask(nextState.tetromino, nextState.tetrominoPosition)
    .clearMask(nextState.tetromino, nextState.projectionPosition)

  // Update positions of both the tetromino and its projection.
  nextState.tetrominoPosition.row += delta.row
  nextState.tetrominoPosition.col += delta.col
  nextState.projectionPosition = {row: project(nextState), col: nextState.tetrominoPosition.col}

  // Re-insert the tetromino and its projection into the board.
  // The order of insertion is important; the tetromino should
  // be inserted last, so that it can take precedence over its
  // projection, and be rendered on top of it.
  nextState.board = nextState.board
    .insert(createProjectionTetromino(nextTetromino), nextState.projectionPosition)
    .insert(nextTetromino, nextState.tetrominoPosition)

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
  delta: Position
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

function playPlaceEffectSequence() {
  util.playAudio(util.AudioAsset.Floor)
  dom.playAnimation(document.querySelector(Const.BOARD_SELECTOR)!, Animation.AbsorbBottomShock, 400)

  effects.spawnParticles({
    countMin: 10,
    countMax: 15,
    lifetimeMin: 1000,
    lifetimeMax: 2500,
    radiusMin: 3,
    radiusMax: 10,
    blurMin: 1,
    blurMax: 2,
    classNames: ["particle", "action"],
    velocityFactor: 0.2,
    opacityMin: 0,
    opacityMax: 0.9,
  })
}

function tick(state: State): State {
  // REVISE: Break function down into smaller functions (e.g. `lockTetromino`, `updateTetrominoPosition`, `updateProjectionPosition`, `insertTetromino`, `insertProjection`).

  const nextState: State = cloneState(state)

  // Remove the current tetromino from the board, since its
  // position will be updated.
  nextState.board = nextState.board
    .clearMask(nextState.tetromino, nextState.tetrominoPosition)

  const collisionCheckResult = wouldCollide(
    nextState.board,
    nextState.tetromino,
    nextState.tetrominoPosition,
    {row: 1, col: 0}
  )

  // If there is a collision, lock the current tetromino, and reset the
  // tetromino on the state.
  if (collisionCheckResult !== CollisionCheckResult.NoCollision) {
    if (collisionCheckResult === CollisionCheckResult.Ceiling) {
      alert("Game over!")
      window.location.reload()
    }

    // By inserting the tetromino into the board, a clone is created,
    // and locked into place.
    nextState.board = nextState.board.insert(nextState.tetromino, nextState.tetrominoPosition)

    // Reset the current tetromino, and position it at the top of the board.
    // Its projection position should also be updated.
    nextState.tetromino = Tetromino.random

    nextState.tetrominoPosition = {
      row: 0,
      col: calculateMiddleCol(nextState.board.cols, nextState.tetromino.cols)
    }

    nextState.projectionPosition = {
      row: project(nextState),
      col: nextState.tetrominoPosition.col,
    }

    playPlaceEffectSequence()
  }
  // Otherwise, update the tetromino position by shifting it down by one row.
  else
    nextState.tetrominoPosition.row += 1

  // Insert the current tetromino into the board.
  nextState.board = nextState.board
    .insert(nextState.tetromino, nextState.tetrominoPosition)

  return nextState
}

function onRotate(state: State): State | null {
  const rotatedTetromino = state.tetromino.rotateClockwise()

  // BUG: The `wouldCollide` function clears the tetromino from the board to prevent self-collision. This is likely the cause of the rotation bug.
  const collisionCheck = wouldCollide(state.board, rotatedTetromino, state.tetrominoPosition, {row: 0, col: 0})

  // Prevent the tetromino from rotating if it would collide with the walls or floor.
  if (collisionCheck !== CollisionCheckResult.NoCollision) {
    console.log("Denied rotation", collisionCheck)

    return null
  }

  return updateTetromino(rotatedTetromino, {row: 0, col: 0}, state)
}

function onHorizontalMove(state: State, deltaCol: number): State | null {
  const delta: Position = {row: 0, col: deltaCol}

  if (couldMove(delta, state))
    return updateTetromino(state.tetromino, delta, state)

  const disallowedAnimation: Animation = deltaCol < 0
    ? Animation.LimitedShockLeft
    : Animation.LimitedShockRight

  dom.playAnimation(document.querySelector(Const.BOARD_SELECTOR)!, disallowedAnimation, 300)

  return null
}

function project(state: State): number {
  const projectionState = cloneState(state)

  // Move as far down as possible.
  while (couldMove({row: 1, col: 0}, projectionState))
    projectionState.tetrominoPosition.row += 1

  return projectionState.tetrominoPosition.row
}

function onPlace(state: State): State | null {
  const nextState = cloneState(state)

  nextState.board = nextState.board
    .insert(nextState.tetromino, nextState.projectionPosition)
    .clearMask(nextState.tetromino, nextState.tetrominoPosition)

  const middleCol = calculateMiddleCol(Const.BOARD_COLS, nextState.tetromino.cols)

  nextState.tetromino = Tetromino.random
  nextState.tetrominoPosition = {col: middleCol, row: 0}
  nextState.projectionPosition = {col: middleCol, row: Const.BOARD_ROWS - nextState.tetromino.rows}
  playPlaceEffectSequence()

  return nextState
}


window.addEventListener("load", () => {
  console.log("Game logic loaded")

  const $board = document.querySelector(Const.BOARD_SELECTOR)!

  dom.createBoardCells().forEach($cell => $board.appendChild($cell))
  console.log(`Initialized HTML board (${Const.BOARD_COLS}x${Const.BOARD_ROWS})`)

  const initialTetromino = Tetromino.random
  const middleCol = calculateMiddleCol(Const.BOARD_COLS, initialTetromino.cols)

  let state: State = {
    board: new Matrix(Const.BOARD_ROWS, Const.BOARD_COLS),
    tetromino: initialTetromino,
    tetrominoPosition: {row: 0, col: middleCol},
    projectionPosition: {row: Const.BOARD_ROWS - initialTetromino.rows, col: middleCol},
  }

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
      state.board = state.board.clearMask(state.tetromino, state.projectionPosition)
      dom.render(state)
    }
  })

  // Setup effects, animations, and audio.
  util.playThemeAudio()
  effects.initializeParticles()

  // Spawn background particles.
  effects.spawnParticles({
    countMin: 30,
    countMax: 40,
    lifetimeMin: 5000,
    // TODO: Background particles need to life forever, or new ones need to be spawned every so often.
    lifetimeMax: 50_000,
    radiusMin: 5,
    radiusMax: 30,
    blurMin: 1,
    blurMax: 3,
    classNames: ["particle"],
    velocityFactor: 0.02,
    opacityMin: 0,
    opacityMax: 0.1,
  })

  // Initial render.
  state.board = state.board
    .insert(createProjectionTetromino(state.tetromino), state.projectionPosition)
    .insert(state.tetromino, state.tetrominoPosition)

  dom.render(state)
  console.log("Initial render")

  // Start game loop.
  setInterval(() => {
    state = tick(state)
    dom.render(state)
    console.log("tick")
  }, Const.TICK_INTERVAL)
})
