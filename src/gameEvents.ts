import {PlacementPosition, State} from "./state"
import * as util from "./util"
import * as game from "./game"
import * as effects from "./effects"
import * as dom from "./dom"

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
    onTetrominoCollisionWithCeiling(state)

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
    state.tetrominoPosition.row,
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
  const clonedState = stateAfterPlacement.clone()

  util.assert(
    endRow < clonedState.board.rows,
    "end row should not be out of bounds (it's more than the board's rows)"
  )

  effects.playPlacementEffectSequence()

  const rowsToClear: number[] = []

  for (let row = placementRowStart; row <= endRow; row++) {
    const isRowFilled = clonedState.board.unwrap()[row]
      .every(cell => cell !== game.CellState.Empty && cell !== game.CellState.Projection)

    // Do not clear the row immediately, as this would create
    // an invalid iteration state for the loop.
    if (isRowFilled)
      rowsToClear.push(row)
  }

  if (rowsToClear.length > 0)
    effects.playRowClearEffectSequence(rowsToClear)

  const nextBoard = rowsToClear.reduce(
    (nextBoard, row) => nextBoard.clearRowAndCollapse(row),
    clonedState.board.clone()
  )

  const nextState = clonedState.modify({board: nextBoard})

  return rowsToClear.length > 0
    // If there were rows cleared, update the projection position,
    // since it may be offset by the amount of rows cleared, causing
    // 'ghost' parts of the projection to be visible.
    ? onRowsCleared(rowsToClear.length, nextState.updateProjection())
    : nextState
}

function onRowsCleared(amount: number, state: State): State {
  util.assert(amount > 0, "at least one row should be cleared when calling this function")
  util.assert(amount <= 4, "at most 4 rows should be cleared by any single move")

  if (amount === 4)
    effects.playTetrisScoreEffectSequence()
  else
    util.playSound(util.Sound.LineClear)

  let scoreAcquired: number

  switch (amount) {
    case 1: scoreAcquired = game.Const.ROW_SCORE_SINGLE; break
    case 2: scoreAcquired = game.Const.ROW_SCORE_DOUBLE; break
    case 3: scoreAcquired = game.Const.ROW_SCORE_TRIPLE; break
    case 4: scoreAcquired = game.Const.ROW_SCORE_TETRIS; break
    default:
      throw new Error("unexpected amount of rows cleared, should be between 1 and 4")
  }

  // Increment score when clearing rows.
  const nextScore = state.score + scoreAcquired

  const nextFallTickInterval = game.calculateNextFallTickInterval(
    state.fallTickInterval,
    amount
  )

  // REVISE: This isn't 'connected' to exactly when the DOM updates. Find a better way to do this.
  dom.playAnimation(dom.getStatElement(dom.Stat.Score), dom.Animation.StatHighlight, 100)

  return state.modify({
    score: nextScore,
    // Only update fall tick interval if there was at least
    // one row cleared.
    fallTickInterval: amount > 0 ? nextFallTickInterval : undefined
  })
}

export function onTetrominoCollisionWithCeiling(state: State): void {
  alert(`Game over! Score: ${state.score}`)
  window.location.reload()
}
