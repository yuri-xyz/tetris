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
  readonly combo: number
}

export enum PlacementPosition {
  InPlace,
  IntoProjection
}

export class State {
  readonly board: Matrix
  readonly tetromino: Matrix
  readonly tetrominoPosition: Position
  readonly projectionPosition: Position
  readonly fallTickInterval: number
  readonly score: number
  readonly isPaused: boolean
  readonly combo: number

  constructor(options: StateOptions) {
    this.board = options.board
    this.tetromino = options.tetromino
    this.tetrominoPosition = options.tetrominoPosition
    this.projectionPosition = options.projectionPosition
    this.fallTickInterval = options.fallTickInterval
    this.score = options.score
    this.isPaused = options.isPaused
    this.combo = options.combo
  }

  modify(changes: Partial<StateOptions>): State {
    if (changes.tetromino !== undefined)
      changes.tetromino.iter((_position, state) => util.assert(
        state !== CellState.Projection,
        "state tetromino should not contain projection cells"
      ))

    return new State({
      board: changes.board || this.board.clone(),
      tetromino: changes.tetromino || this.tetromino.clone(),
      tetrominoPosition: changes.tetrominoPosition || {...this.tetrominoPosition},
      projectionPosition: changes.projectionPosition || {...this.projectionPosition},
      fallTickInterval: changes.fallTickInterval || this.fallTickInterval,
      score: changes.score || this.score,
      isPaused: changes.isPaused || this.isPaused,
      combo: changes.combo || this.combo
    })
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
