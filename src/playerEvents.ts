import {Position} from "./game"
import * as game from "./game"
import {PlacementPosition, State} from "./state"
import * as gameEvents from "./gameEvents"
import * as dom from "./dom"

export function onPlayerHorizontalShiftInput(state: State, isLeft: boolean): State | null {
  const delta: Position = {row: 0, col: isLeft ? -1 : 1}
  const isValidMove = game.couldMove(delta, state.board, state.tetromino, state.tetrominoPosition)

  if (isValidMove)
    return state
      .clearTetrominoAndProjection()
      .addTetrominoPositionDelta(delta)
      .updateProjection()
      .placeTetromino(PlacementPosition.InPlace)

  const disallowedAnimation: dom.Animation = isLeft
    ? dom.Animation.LimitedShockLeft
    : dom.Animation.LimitedShockRight

  const $board = document.querySelector<HTMLElement>(game.Const.BOARD_SELECTOR)!

  dom.playAnimation($board, disallowedAnimation, 300)

  return null
}

export function onPlayerPlacementInput(state: State): State | null {
  const nextState = state
    .clearTetrominoAndProjection()
    .placeTetromino(PlacementPosition.IntoProjection)
    .refreshTetromino()
    .updateProjection()

  return gameEvents.onTetrominoPlacement(
    nextState,
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
  if (collisionCheckResult !== game.CollisionCheckResult.NoCollision)
    return null

  return state
    .clearTetrominoAndProjection()
    .modify({tetromino: rotatedTetromino})
    .updateProjection()
    .placeTetromino(PlacementPosition.InPlace)
}
