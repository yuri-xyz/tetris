import {State} from "./state"
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
  if (collisionCheckResult === game.CollisionCheckResult.NoCollision) {
    const nextState = state.addTetrominoPositionDelta(fallDelta)

    return game.refreshState(
      state.tetrominoPosition,
      nextState,
      game.StateChange.TetrominoUpdated
    )
  }
  // If there was a collision with a ceiling, the game is over.
  else if (collisionCheckResult === game.CollisionCheckResult.Ceiling) {
    alert("Game over!")
    window.location.reload()

    return state
  }

  util.assert(
    collisionCheckResult === game.CollisionCheckResult.WallsOrFloorOrOtherTetromino,
    "collision check result should only be composed of three variants"
  )

  // At this point, a collision occurred: lock the current tetromino
  // in-place, and refresh to a new tetromino.
  return onTetrominoPlacement(
    game.refreshState(state.tetrominoPosition, state, game.StateChange.PlaceInPlace),
    state.tetrominoPosition.row,
    state.tetromino.rows
  )
}

export function onTetrominoPlacement(
  stateAfterPlacement: State,
  placementRowStart: number,
  span: number
): State {
  util.assert(span >= 0, "span should be greater than or equal to zero")
  util.assert(placementRowStart >= 0, "placement row should be greater than or equal to zero")

  // FIXME: Address whether to adjust the span or not. And check its callers.

  // Span must be reduced by one, otherwise there would be an extra row.
  // For example, from row `0`, with a span of `1` row, the total amount
  // of rows to clear would be `0` and `1`, which is two rows.
  const adjustedSpan = span - 1

  const endRow = placementRowStart + adjustedSpan

  util.assert(
    endRow < stateAfterPlacement.board.rows,
    "end row should not be out of bounds (it's more than the board's rows)"
  )

  const rowsToClear: number[] = []

  for (let row = placementRowStart; row < endRow; row++) {
    const isRowFilled = stateAfterPlacement.board.unwrap()[row]
      .every(cell => cell !== game.CellState.Empty && cell !== game.CellState.Projection)

    // Do not clear the row immediately, as this would create
    // an invalid iteration state for the loop.
    if (isRowFilled)
      rowsToClear.push(row)
  }

  // FIXME: This is temporary.
  if (rowsToClear.length > 0)
    alert("Clearing rows!")

  let nextBoard = stateAfterPlacement.board.clone()

  for (const row of rowsToClear)
    nextBoard = nextBoard.clearRowAndCollapse(row)

  effects.playPlacementEffectSequence()

  return stateAfterPlacement.update({board: nextBoard})
}
