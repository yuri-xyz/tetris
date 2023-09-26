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
  readonly fallTickInterval: number
  readonly score: number
  readonly isPaused: boolean
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
    readonly projectionPosition: Position,
    readonly fallTickInterval: number,
    readonly score: number,
    readonly isPaused: boolean
  ) {
    //
  }

  modify(changes: Partial<StateOptions>): State {
    if (changes.tetromino !== undefined)
      changes.tetromino.iter((_position, state) => util.assert(
        state !== CellState.Projection,
        "state tetromino should not contain projection cells"
      ))

    return new State(
      changes.board || this.board.clone(),
      changes.tetromino || this.tetromino.clone(),
      changes.tetrominoPosition || {...this.tetrominoPosition},
      changes.projectionPosition || {...this.projectionPosition},
      changes.fallTickInterval || this.fallTickInterval,
      changes.score || this.score,
      changes.isPaused || this.isPaused
    )
  }

  placeTetromino(placementPosition: PlacementPosition): State {
    const position: Position = placementPosition === PlacementPosition.InPlace
      ? this.tetrominoPosition
      : this.projectionPosition

    const tetromino = this.tetromino.clone()

    return this.modify({
      board: this.board.insert(tetromino, position)
    })
  }

  refreshTetromino(): State {
    const newTetromino = game.Const.IS_DEBUG_MODE && game.Const.DEBUG_ONLY_STRAIGHT_TETROMINOS
      ? Tetromino.straight
      : Tetromino.random

    const newTetrominoEntryPoint: Position = {
      row: 0,
      col: game.calculateMiddleCol(this.board.cols, newTetromino.cols)
    }

    return this.modify({
      tetromino: newTetromino,
      tetrominoPosition: newTetrominoEntryPoint
    })
  }

  clearTetrominoAndProjection(): State {
    return this.modify({
      board: this.board
        .clearMask(this.tetromino, this.tetrominoPosition)
        .clearMask(this.tetromino, this.projectionPosition)
    })
  }

  updateProjection(): State {
    const nextProjectionPosition: Position = {
      row: game.projectRow(this.board, this.tetromino, this.tetrominoPosition),
      col: this.tetrominoPosition.col
    }

    const projectionTetromino = game.createProjectionTetromino(this.tetromino)

    const nextBoard = this.board
      // Insert new projection into the new board.
      .insert(projectionTetromino, nextProjectionPosition)

    return this.modify({
      board: nextBoard,
      projectionPosition: nextProjectionPosition
    })
  }

  addTetrominoPositionDelta(delta: Position): State {
    return this.modify({
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
