import {Position} from "./game"
import Matrix from "./matrix"

export type StateOptions = {
  readonly board: Matrix
  readonly tetromino: Matrix
  readonly tetrominoPosition: Position
  readonly projectionPosition: Position
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

  update(changes: Partial<StateOptions>): State {
    return new State(
      changes.board || this.board.clone(),
      changes.tetromino || this.tetromino.clone(),
      changes.tetrominoPosition || {...this.tetrominoPosition},
      changes.projectionPosition || {...this.projectionPosition}
    )
  }

  clone(): State {
    return this.update({})
  }

  choose(next: State | null): State {
    return next || this
  }
}
