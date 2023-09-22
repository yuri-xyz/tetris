import {CellState} from "./game"
import Matrix from "./matrix"
import {chooseRandom} from "./util"

export default abstract class Tetromino {
  private static getRandomColorState(): CellState {
    const choices = [
      CellState.Red,
      CellState.Green,
      CellState.LightGreen,
      CellState.Pink,
      CellState.Orange,
      CellState.Yellow,
      CellState.Purple,
    ]

    return chooseRandom(choices)
  }

  static get square(): Matrix {
    return new Matrix(2, 2, this.getRandomColorState())
  }

  static get straight(): Matrix {
    return new Matrix(4, 1, this.getRandomColorState())
  }

  static get t(): Matrix {
    const matrix = new Matrix(2, 3, this.getRandomColorState())

    return matrix
      .set({row: 1, col: 0}, CellState.Empty)
      .set({row: 1, col: 2}, CellState.Empty)
  }

  static get l(): Matrix {
    const matrix = new Matrix(3, 2, this.getRandomColorState())

    return matrix
      .set({row: 0, col: 1}, CellState.Empty)
      .set({row: 1, col: 1}, CellState.Empty)
  }

  static get skew(): Matrix {
    const matrix = new Matrix(2, 3, this.getRandomColorState())

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
