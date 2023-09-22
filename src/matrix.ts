import {CellState, Position} from "./game"
import {assert} from "./util"

type ArrayMatrix = CellState[][]

export default class Matrix {
  readonly rows: number
  readonly cols: number
  private readonly inner: ArrayMatrix

  constructor(rows: number, cols: number, fillValue: CellState = CellState.Empty) {
    assert(rows > 0, "matrix should have at least one row")
    assert(cols > 0, "matrix should have at least one column")

    this.rows = rows
    this.cols = cols
    this.inner = Array.from({length: rows}, () => Array(cols).fill(fillValue))

    const rowsCreated = this.inner.length
    const colsCreated = this.inner[0].length

    assert(rowsCreated === rows, "created rows should match requested rows")
    assert(colsCreated === cols, "created cols should match requested cols")
  }

  iter(callback: (position: Position, state: CellState) => void): void {
    for (let row = 0; row < this.rows; row++)
      for (let col = 0; col < this.cols; col++)
        callback({row, col}, this.inner[row][col])
  }

  set(position: Position, state: CellState): Matrix {
    assert(position.row >= 0 && position.row < this.rows, "row should be within bounds")
    assert(position.col >= 0 && position.col < this.cols, "col should be within bounds")

    const result = this.clone()

    result.inner[position.row][position.col] = state

    return result
  }

  unwrap(): ArrayMatrix {
    return this.inner
  }

  clear(mask: Matrix, offset: Position): Matrix {
    assert(mask.rows + offset.row <= this.rows, "mask matrix should have fewer rows")
    assert(mask.cols + offset.col <= this.cols, "mask matrix should have fewer cols")

    const result = this.clone()

    mask.iter(({row, col}, state) => {
      if (state !== CellState.Empty)
        result.inner[row + offset.row][col + offset.col] = CellState.Empty
    })

    return result
  }

  insert(mask: Matrix, offset: Position): Matrix {
    assert(mask.rows + offset.row <= this.rows, "insertion matrix should have fewer rows")
    assert(mask.cols + offset.col <= this.cols, "insertion matrix should have fewer cols")

    const result = this.clone()

    mask.iter(({row, col}, state) => {
      if (state !== CellState.Empty)
        result.inner[row + offset.row][col + offset.col] = state
    })

    return result
  }

  shiftDown(): Matrix {
    const result = this.clone()

    for (let row = this.rows - 1; row > 0; row--)
      for (let col = 0; col < this.cols; col++)
        result.inner[row][col] = this.inner[row - 1][col]

    return result
  }

  clone(): Matrix {
    const result = new Matrix(this.rows, this.cols)

    this.iter(({row, col}, state) => {
      result.inner[row][col] = state
    })

    return result
  }

  toFilledPositionList(): Position[] {
    const result: Position[] = []

    this.iter(({row, col}, state) => {
      if (state !== CellState.Empty)
        result.push({row, col})
    })

    return result
  }

  rotateClockwise(): Matrix {
    const result = new Matrix(this.cols, this.rows)

    this.iter(({row, col}, state) => {
      const newRow = col
      const newCol = this.rows - row - 1

      result.inner[newRow][newCol] = state
    })

    return result
  }

  rotateCounterClockwise(): Matrix {
    const result = new Matrix(this.cols, this.rows)

    this.iter(({row, col}, state) => {
      const newRow = this.cols - col - 1
      const newCol = row

      result.inner[newRow][newCol] = state
    })

    return result
  }
}
