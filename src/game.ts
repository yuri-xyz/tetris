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

function cloneState(state: State, changes?: Partial<State>): State {
  const clonedState: State = {
    board: state.board.clone(),
    tetromino: state.tetromino.clone(),
    tetrominoPosition: {...state.tetrominoPosition},
    projectionPosition: {...state.projectionPosition},
  }

  if (changes !== undefined) {
    clonedState.board = changes.board ?? clonedState.board
    clonedState.tetromino = changes.tetromino ?? clonedState.tetromino
    clonedState.tetrominoPosition = changes.tetrominoPosition ?? clonedState.tetrominoPosition
  }

  return clonedState
}

function updateState(state: State, nextState: State | null): State {
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
    if (state === CellState.Empty)
      return

    const boardRow = row + virtualPosition.row
    const boardCol = col + virtualPosition.col

    if (virtualBoard.unwrap()[boardRow][boardCol] !== CellState.Empty)
      collidedAgainstCell = true
  })

  if (tetrominoPosition.row === 0 && collidedAgainstCell)
    return CollisionCheckResult.Ceiling

  return collidedAgainstCell
    ? CollisionCheckResult.WallsOrFloorOrOtherTetromino
    : CollisionCheckResult.NoCollision
}

function canMove(delta: Position, state: State): boolean {
  return wouldCollide(state.board, state.tetromino, state.tetrominoPosition, delta)
    === CollisionCheckResult.NoCollision
}

function tick(previousState: State): State {
  const nextState: State = cloneState(previousState)

  // Remove the current tetromino from the board, along with
  // its projection, since its position will be updated.
  nextState.board = nextState.board
    .clearMask(nextState.tetromino, nextState.tetrominoPosition)
    .clearMask(nextState.tetromino, nextState.projectionPosition)

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

    nextState.tetromino = Tetromino.random

    nextState.tetrominoPosition = {
      row: 0,
      col: calculateMiddleCol(nextState.board.cols, nextState.tetromino.cols)
    }

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
  // Otherwise, update the tetromino position by shifting it down by one row.
  else
    nextState.tetrominoPosition.row += 1

  const projectionTetromino = nextState.tetromino.transform((_position, state) => {
    if (state === CellState.Empty)
      return state

    return CellState.Projection
  })

  const nextProjectionRow = project(nextState)
  const nextProjectionPosition = {row: nextProjectionRow, col: nextState.tetrominoPosition.col}

  nextState.projectionPosition = nextProjectionPosition

  // Insert the current tetromino, and its projection into the board.
  nextState.board = nextState.board
    .insert(nextState.tetromino, nextState.tetrominoPosition)
    .insert(projectionTetromino, nextState.projectionPosition)

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

  const nextState = cloneState(state)

  nextState.board = nextState.board.clearMask(nextState.tetromino, nextState.tetrominoPosition)
  nextState.tetromino = rotatedTetromino
  nextState.board = nextState.board.insert(nextState.tetromino, nextState.tetrominoPosition)

  return nextState
}

function onHorizontalMove(state: State, deltaCol: number): State | null {
  const delta: Position = {row: 0, col: deltaCol}

  if (canMove(delta, state)) {
    const nextState = cloneState(state)

    nextState.board = nextState.board.clearMask(nextState.tetromino, nextState.tetrominoPosition)
    nextState.tetrominoPosition.row += delta.row
    nextState.tetrominoPosition.col += delta.col
    nextState.board = nextState.board.insert(nextState.tetromino, nextState.tetrominoPosition)

    return nextState
  }

  const disallowedAnimation: Animation = deltaCol < 0
    ? Animation.LimitedShockLeft
    : Animation.LimitedShockRight

  dom.playAnimation(document.querySelector(Const.BOARD_SELECTOR)!, disallowedAnimation, 300)

  return null
}

function project(state: State): number {
  const projectionState = cloneState(state)

  // Move as far down as possible.
  while (canMove({row: 1, col: 0}, projectionState))
    projectionState.tetrominoPosition.row += 1

  return projectionState.tetrominoPosition.row
}

function onPlace(state: State): State | null {
  const projectionRow = project(state)
  const nextState = cloneState(state)

  nextState.tetrominoPosition = {col: state.tetrominoPosition.col, row: projectionRow}

  // Remove the current tetromino, and insert the projection.
  nextState.board = nextState.board
    .clearMask(state.tetromino, state.tetrominoPosition)
    .insert(nextState.tetromino, nextState.tetrominoPosition)

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
    projectionPosition: {row: Const.BOARD_ROWS - 1, col: middleCol},
  }

  window.addEventListener("keydown", event => {
    // TODO: Handle out of bounds. Simply ignore if it would go out of bounds (use a `constrain` helper function).
    switch (event.key) {
      case "ArrowLeft": state = updateState(state, onHorizontalMove(state, -1)); break
      case "ArrowRight": state = updateState(state, onHorizontalMove(state, 1)); break
      case "ArrowUp": state = updateState(state, onRotate(state)); break
      case " ": state = updateState(state, onPlace(state)); break
    }

    // OPTIMIZE: If the state wasn't updated, there's no need to force a re-render.
    dom.render(state)
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
  state.board = state.board.insert(state.tetromino, state.tetrominoPosition)
  dom.render(state)
  console.log("Initial render")

  // Start game loop.
  setInterval(() => {
    state = tick(state)
    dom.render(state)
    console.log("tick")
  }, Const.TICK_INTERVAL)
})
