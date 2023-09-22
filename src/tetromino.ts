import {CellState} from "./game"
import Matrix from "./matrix"

export default abstract class Tetromino {
  static get square() {
    return new Matrix(2, 2, CellState.Filled)
  }

  static get line() {
    return new Matrix(4, 1, CellState.Filled)
  }
}
