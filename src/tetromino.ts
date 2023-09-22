import {CellState} from "./game"
import Matrix from "./matrix"
import {chooseRandom} from "./util"

export default abstract class Tetromino {
  static get square(): Matrix {
    return new Matrix(2, 2, CellState.Filled)
  }

  static get straight(): Matrix {
    return new Matrix(4, 1, CellState.Filled)
  }

  static get t(): Matrix {
    const matrix = new Matrix(2, 3, CellState.Filled)

    return matrix
      .set({row: 1, col: 0}, CellState.Empty)
      .set({row: 1, col: 2}, CellState.Empty)
  }

  static get l(): Matrix {
    const matrix = new Matrix(3, 2, CellState.Filled)

    return matrix
      .set({row: 0, col: 1}, CellState.Empty)
      .set({row: 1, col: 1}, CellState.Empty)
  }

  static get skew(): Matrix {
    const matrix = new Matrix(2, 3, CellState.Filled)

    return matrix
      .set({row: 0, col: 0}, CellState.Empty)
      .set({row: 1, col: 2}, CellState.Empty)
  }

  static get random(): Matrix {
    const choices = [
      () => Tetromino.square,
      () => Tetromino.straight,
      () => Tetromino.t,
      () => Tetromino.l,
      () => Tetromino.skew,
    ]

    return chooseRandom(choices)()
  }
}
