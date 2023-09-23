import {Position} from "./game"
import * as game from "./game"
import {State} from "./state"
import * as gameEvents from "./gameEvents"
import * as dom from "./dom"

export function onPlayerHorizontalShiftInput(state: State, deltaCol: number): State | null {
  const delta: Position = {row: 0, col: deltaCol}
  const isValidMove = game.couldMove(delta, state.board, state.tetromino, state.tetrominoPosition)

  if (isValidMove) {
    const nextState = state.addTetrominoPositionDelta(delta)

    return game.updateTetrominoState(nextState, game.TetrominoUpdate.Recompute)
  }

  const disallowedAnimation: dom.Animation = deltaCol < 0
    ? dom.Animation.LimitedShockLeft
    : dom.Animation.LimitedShockRight

  const $board = document.querySelector<HTMLElement>(game.Const.BOARD_SELECTOR)!

  dom.playAnimation($board, disallowedAnimation, 300)

  return null
}

export function onPlayerPlacementInput(state: State): State | null {
  return gameEvents.onTetrominoPlacement(
    game.updateTetrominoState(state, game.TetrominoUpdate.PlaceIntoProjection),
    state.projectionPosition.row,
    state.tetromino.rows
  )
}

export function onPlayerRotateInput(state: State): State | null {
  const rotatedTetromino = state.tetromino.rotateClockwise()

  // BUG: The `wouldCollide` function clears the tetromino from the board to prevent self-collision. This is likely the cause of the rotation bug.
  const collisionCheckResult = game.wouldCollide(
    state.board,
    rotatedTetromino,
    state.tetrominoPosition
  )

  // Prevent the tetromino from rotating if it would collide with the walls or floor.
  if (collisionCheckResult !== game.CollisionCheckResult.NoCollision) {
    console.log("Denied rotation", collisionCheckResult)

    return null
  }

  const nextState = state.update({tetromino: rotatedTetromino})

  return game.updateTetrominoState(nextState, game.TetrominoUpdate.Recompute)
}
