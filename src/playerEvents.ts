import {Position} from "./game"
import * as game from "./game"
import {State} from "./state"
import * as gameEvents from "./gameEvents"
import Tetromino from "./tetromino"
import * as dom from "./dom"

export function onPlayerHorizontalShiftInput(state: State, deltaCol: number): State | null {
  const delta: Position = {row: 0, col: deltaCol}

  if (game.couldMove(delta, state))
    return game.updateTetromino(state.tetromino, state, delta)

  const disallowedAnimation: dom.Animation = deltaCol < 0
    ? dom.Animation.LimitedShockLeft
    : dom.Animation.LimitedShockRight

  dom.playAnimation(document.querySelector(game.Const.BOARD_SELECTOR)!, disallowedAnimation, 300)

  return null
}

export function onPlayerPlacementInput(state: State): State | null {
  const nextTetromino = Tetromino.random

  const nextProjectionPosition: Position = {
    row: game.Const.BOARD_ROWS - nextTetromino.rows,
    col: game.calculateMiddleCol(state.board.cols, nextTetromino.cols)
  }

  const nextState = state.update({
    board: state.board
      .clearMask(state.tetromino, state.tetrominoPosition)
      .insert(state.tetromino, state.projectionPosition),
    tetromino: nextTetromino,
    tetrominoPosition: {row: 0, col: game.calculateMiddleCol(state.board.cols, nextTetromino.cols)},
    projectionPosition: nextProjectionPosition
  })

  return gameEvents.onTetrominoPlacement(nextState, state.projectionPosition.row, state.tetromino.rows)
}

export function onPlayerRotateInput(state: State): State | null {
  const rotatedTetromino = state.tetromino.rotateClockwise()

  // BUG: The `wouldCollide` function clears the tetromino from the board to prevent self-collision. This is likely the cause of the rotation bug.
  const collisionCheck = game.wouldCollide(state.board, rotatedTetromino, state.tetrominoPosition)

  // Prevent the tetromino from rotating if it would collide with the walls or floor.
  if (collisionCheck !== game.CollisionCheckResult.NoCollision) {
    console.log("Denied rotation", collisionCheck)

    return null
  }

  return game.updateTetromino(rotatedTetromino, state)
}
