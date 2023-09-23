import {State} from "./state"
import * as util from "./util"
import * as game from "./game"
import Tetromino from "./tetromino"

export function onFallTick(state: State): State {
  // REVISE: Break function down into smaller functions (e.g. `lockTetromino`, `updateTetrominoPosition`, `updateProjectionPosition`, `insertTetromino`, `insertProjection`).

  const collisionCheckResult = game.wouldCollide(
    state.board,
    state.tetromino,
    state.tetrominoPosition,
    {row: 1, col: 0}
  )

  // If there is no collision, update the tetromino position
  // by shifting it down by one row.
  if (collisionCheckResult === game.CollisionCheckResult.NoCollision)
    return game.updateTetromino(state.tetromino, state, {row: 1, col: 0})
  else if (collisionCheckResult === game.CollisionCheckResult.Ceiling) {
    alert("Game over!")
    window.location.reload()

    return state
  }

  util.assert(
    collisionCheckResult === game.CollisionCheckResult.WallsOrFloorOrOtherTetromino,
    "collision check result should only be composed of three variants"
  )

  // At this point, a collision occurred: lock the current tetromino,
  // and refresh to a new tetromino.

  const nextTetromino = Tetromino.random

  const nextTetrominoPosition: game.Position = {
    row: 0,
    col: game.calculateMiddleCol(state.board.cols, nextTetromino.cols)
  }

  const nextProjectionPosition: game.Position = {
    row: game.Const.BOARD_ROWS - nextTetromino.rows,
    col: nextTetrominoPosition.col
  }

  const nextState = state.update({
    // By inserting the tetromino into the board, a clone is created,
    // and locked into place.
    board: state.board
      .insert(nextTetromino, state.tetrominoPosition)
      .insert(game.createProjectionTetromino(nextTetromino), nextProjectionPosition),
    // Reset the current tetromino, and position it at the top of the board.
    // Its projection position should also be updated.
    tetromino: nextTetromino,
    tetrominoPosition: nextTetrominoPosition,
    projectionPosition: nextProjectionPosition,
  })

  return onTetrominoPlacement(nextState, state.tetrominoPosition.row, state.tetromino.rows)
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

  let nextBoard = stateAfterPlacement.board.clone()

  for (const row of rowsToClear)
    nextBoard = nextBoard.clearRowAndCollapse(row)

  return stateAfterPlacement.update({board: nextBoard})
}
