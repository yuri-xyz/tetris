import {PlacementPosition, State} from "./state"
import * as util from "./util"
import * as game from "./game"
import * as effects from "./effects"

export function onFallTick(state: State): State {
  // On every tick, shift the tetromino down by one row.
  const fallDelta: game.Position = {row: 1, col: 0}

  const collisionCheckResult = game.wouldCollide(
    state.board,
    state.tetromino,
    state.tetrominoPosition,
    fallDelta
  )

  // If there is no collision, update the tetromino position
  // by shifting it down by one row.
  if (collisionCheckResult === game.CollisionCheckResult.NoCollision)
    return state
      .clearTetrominoAndProjection()
      .addTetrominoPositionDelta(fallDelta)
      .updateProjection()
      .placeTetromino(PlacementPosition.InPlace)
  // If there was a collision with a ceiling, the game is over.
  else if (collisionCheckResult === game.CollisionCheckResult.Ceiling) {
    onTetrominoCollisionWithCeiling()

    return state
  }

  util.assert(
    collisionCheckResult === game.CollisionCheckResult.WallsOrFloorOrOtherTetromino,
    "collision check result should only be composed of three variants"
  )

  // At this point, a collision occurred: lock the current tetromino
  // in-place, and refresh to a new tetromino.
  const nextState = state
    .placeTetromino(PlacementPosition.InPlace)
    .refreshTetromino()
    .updateProjection()

  return onTetrominoPlacement(
    nextState,
    nextState.tetrominoPosition.row,
    state.tetromino.rows
  )
}

export function onTetrominoPlacement(
  stateAfterPlacement: State,
  placementRowStart: number,
  placementRowSpan: number
): State {
  util.assert(placementRowSpan >= 0, "span should be greater than or equal to zero")
  util.assert(placementRowStart >= 0, "placement row should be greater than or equal to zero")

  // FIXME: Address whether to adjust the span or not. And check its callers.

  // Span must be reduced by one, otherwise there would be an extra row.
  // For example, from row `0`, with a span of `1` row, the total amount
  // of rows to clear would be `0` and `1`, which is two rows.
  const adjustedSpan = placementRowSpan - 1

  const endRow = placementRowStart + adjustedSpan
  const nextState = stateAfterPlacement.clone()

  util.assert(
    endRow < nextState.board.rows,
    "end row should not be out of bounds (it's more than the board's rows)"
  )

  effects.playPlacementEffectSequence()

  const rowsToClear: number[] = []

  for (let row = placementRowStart; row < endRow; row++) {
    const isRowFilled = nextState.board.unwrap()[row]
      .every(cell => cell !== game.CellState.Empty && cell !== game.CellState.Projection)

    // Do not clear the row immediately, as this would create
    // an invalid iteration state for the loop.
    if (isRowFilled)
      rowsToClear.push(row)
  }

  // FIXME: This is temporary.
  if (rowsToClear.length > 0) {
    console.log(rowsToClear)
    alert("Clearing rows!")
  }

  const nextBoard = rowsToClear.reduce(
    (nextBoard, row) => nextBoard.clearRowAndCollapse(row),
    nextState.board.clone()
  )

  return nextState.modify({board: nextBoard})
}

export function onTetrominoCollisionWithCeiling() {
  alert("Game over!")
  window.location.reload()
}
