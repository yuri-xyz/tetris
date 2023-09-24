import {CellState, Position} from "./game"
import Matrix from "./matrix"
import * as util from "./util"
import * as game from "./game"
import Tetromino from "./tetromino"

export type StateOptions = {
  readonly board: Matrix
  readonly tetromino: Matrix
  readonly tetrominoPosition: Position
  readonly projectionPosition: Position
}

export enum PlacementPosition {
  InPlace,
  IntoProjection
}

export class State {
  constructor(
    readonly board: Matrix,
    readonly tetromino: Matrix,
    readonly tetrominoPosition: Position,
    readonly projectionPosition: Position
  ) {
    //
  }

  private modify(changes: Partial<StateOptions>): State {
    if (changes.tetromino !== undefined)
      changes.tetromino.iter((_position, state) => util.assert(
        state !== CellState.Projection,
        "state tetromino should not contain projection cells"
      ))

    return new State(
      changes.board || this.board.clone(),
      changes.tetromino || this.tetromino.clone(),
      changes.tetrominoPosition || {...this.tetrominoPosition},
      changes.projectionPosition || {...this.projectionPosition}
    )
  }

  placeTetromino(placementPosition: PlacementPosition): State {
    const position: Position = placementPosition === PlacementPosition.InPlace
      ? this.tetrominoPosition
      : this.projectionPosition

    const tetromino = this.tetromino.clone()
    const nextState = this.refreshTetromino()

    return nextState.modify({
      board: nextState.board.insert(tetromino, position)
    })
  }

  refreshTetromino(): State {
    const newTetromino = Tetromino.random

    const newTetrominoEntryPoint: Position = {
      row: 0,
      col: game.calculateMiddleCol(this.board.cols, newTetromino.cols)
    }

    return this.update({
      tetromino: newTetromino,
      tetrominoPosition: newTetrominoEntryPoint
    })
  }

  clearTetromino(): State {
    return this.modify({
      board: this.board
        .clearMask(this.tetromino, this.tetrominoPosition)
        .clearMask(this.tetromino, this.projectionPosition)
    })
  }

  update(changes: Partial<StateOptions> = {}): State {
    const newState = this.modify(changes)

    const nextProjectionPosition: Position = {
      row: game.projectRow(newState.board, newState.tetromino, newState.tetrominoPosition),
      col: newState.tetrominoPosition.col
    }

    const projectionTetromino = game.createProjectionTetromino(newState.tetromino)

    const nextBoard = newState.board
      // Insert new projection into the new board.
      .insert(projectionTetromino, nextProjectionPosition)
      // Insert new tetromino into the new board.
      .insert(newState.tetromino, newState.tetrominoPosition)

    return new State(
      nextBoard,
      newState.tetromino,
      newState.tetrominoPosition,
      nextProjectionPosition
    )
  }

  addTetrominoPositionDelta(delta: Position): State {
    return this.update({
      tetrominoPosition: {
        row: this.tetrominoPosition.row + delta.row,
        col: this.tetrominoPosition.col + delta.col
      }
    })
  }

  clone(): State {
    return this.modify({})
  }

  choose(next: State | null): State {
    return next || this
  }
}
