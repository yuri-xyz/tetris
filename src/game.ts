import {$createBoardCells, $updateCellState, Animation, $playAnimation} from "./dom"
import {initializeParticles, spawnParticles} from "./effects"
import Matrix from "./matrix"
import Tetromino from "./tetromino"
import {AudioAsset, playAudio, playThemeAudio} from "./util"

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
  Red = "red",
  Green = "green",
  LightGreen = "lightgreen",
  Pink = "pink",
  Orange = "orange",
  Yellow = "yellow",
  Purple = "purple",
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

enum CollisionCheckResult {
  NoCollision,
  WallsOrFloorOrOtherTetromino,
  Ceiling,
}

function wouldCollide(
  board: Matrix,
  tetromino: Matrix,
  tetrominoPosition: Position,
  delta: Position
): CollisionCheckResult {
  const nextPosition = {
    row: tetrominoPosition.row + delta.row,
    col: tetrominoPosition.col + delta.col,
  }

  // Left and right columns.
  if (nextPosition.col < 0 || nextPosition.col + tetromino.cols > board.cols)
    return CollisionCheckResult.WallsOrFloorOrOtherTetromino
  // Bottom of the board.
  else if (nextPosition.row + tetromino.rows > board.rows)
    return CollisionCheckResult.WallsOrFloorOrOtherTetromino

  let collidedAgainstCell = false

  tetromino.iter(({row, col}, state) => {
    if (state === CellState.Empty)
      return

    const boardRow = row + nextPosition.row
    const boardCol = col + nextPosition.col

    if (board.unwrap()[boardRow][boardCol] !== CellState.Empty)
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
  const state: State = {
    board: previousState.board.clone(),
    tetromino: previousState.tetromino.clone(),
    tetrominoPosition: {...previousState.tetrominoPosition},
  }

  // Shift falling tetromino down by one row.
  state.board = state.board.clear(state.tetromino, state.tetrominoPosition)

  const collisionCheckResult = wouldCollide(
    state.board,
    state.tetromino,
    state.tetrominoPosition,
    {row: 1, col: 0}
  )

  // If there is a collision, lock the current tetromino, and reset the
  // tetromino on the state.
  if (collisionCheckResult !== CollisionCheckResult.NoCollision) {
    if (collisionCheckResult === CollisionCheckResult.Ceiling) {
      alert("Game over!")
      window.location.reload()
    }

    state.board = state.board.insert(state.tetromino, state.tetrominoPosition)
    state.tetromino = Tetromino.random

    state.tetrominoPosition = {
      row: 0,
      col: calculateMiddleCol(state.board.cols, state.tetromino.cols)
    }

    playAudio(AudioAsset.Floor)
    $playAnimation(document.querySelector(Const.BOARD_SELECTOR)!, Animation.AbsorbBottomShock, 400)

    spawnParticles({
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
    state.tetrominoPosition.row += 1

  state.board = state.board.insert(state.tetromino, state.tetrominoPosition)

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

    const virtualBoard = state.board.clone()

    virtualBoard.clear(state.tetromino, state.tetrominoPosition)

    const rotatedTetromino = state.tetromino.rotateClockwise()
    const collisionCheck = wouldCollide(virtualBoard, rotatedTetromino, state.tetrominoPosition, {row: 0, col: 0})

    // BUG: It's always being denied for some reason.
    // Prevent the tetromino from rotating if it would collide with the walls or floor.
    // if (collisionCheck !== CollisionCheckResult.NoCollision) {
    //   console.log("Denied rotation", collisionCheck)

    //   return
    // }

    // FIXME: Why is a clear required here? Without it, the tetromino is not FULLY cleared (ie. some cells are still filled).
    state.board = state.board.clear(state.tetromino, state.tetrominoPosition)

    state.tetromino = rotatedTetromino
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

  window.addEventListener("keydown", event => {
    // TODO: Handle out of bounds. Simply ignore if it would go out of bounds (use a `constrain` helper function).

    // FIXME: Why is a clear required here? Without it, the tetromino is not FULLY cleared (ie. some cells are still filled).
    state.board = state.board.clear(state.tetromino, state.tetrominoPosition)

    const delta: Position = {row: 0, col: 0}

    if (event.key === "ArrowLeft")
      delta.col -= 1
    else if (event.key === "ArrowRight")
      delta.col += 1
    else if (event.key === "ArrowDown")
      delta.row += 1

    const animation: Animation = delta.col < 0 ? Animation.LimitedShockLeft : Animation.LimitedShockRight

    if (canMove(delta, state)) {
      state.tetrominoPosition.row += delta.row
      state.tetrominoPosition.col += delta.col
    }
    // If the movement was not a bottom movement, and the move
    // could not be made, play the left/right shock animation.
    else if (delta.row === 0)
      $playAnimation(document.querySelector(Const.BOARD_SELECTOR)!, animation, 300)

    state.board = state.board.insert(state.tetromino, state.tetrominoPosition)
    render(state)
  })

  // Setup effects, animations, and audio.
  playThemeAudio()
  initializeParticles()

  // Spawn background particles.
  spawnParticles({
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
  render(state)
  console.log("Initial render")

  // Start game loop.
  setInterval(() => {
    state = tick(state)
    render(state)
    console.log("tick")
  }, Const.TICK_INTERVAL)
})
