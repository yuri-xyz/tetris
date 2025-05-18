import * as dom from "./dom";
import * as effects from "./effects";
import Matrix from "./matrix";
import {State} from "./state";
import Tetromino from "./tetromino";
import * as playerEvents from "./playerEvents";
import * as gameEvents from "./gameEvents";
import * as util from "./util";

export const Const = {
  BOARD_SELECTOR: "#board",
  CELL_CLASS: "cell",
  BOARD_COLS: 10,
  BOARD_ROWS: 20,
  CELL_HTML_DATASET_STATE_KEY: "tag",
  INITIAL_FALL_TICK_INTERVAL: 700,
  ROW_SCORE_SINGLE: 100,
  ROW_SCORE_DOUBLE: 300,
  ROW_SCORE_TRIPLE: 500,
  ROW_SCORE_TETRIS: 800,
  SPEED_INCREASE_PERCENT_PER_ROW: 5,
  MIN_FALL_INVERVAL: 250,
  // Debugging.
  IS_DEBUG_MODE: false,
  IS_DEBUG_PAUSED: false,
  IS_DEBUG_COORDS_VISIBLE: false,
  DEBUG_ONLY_STRAIGHT_TETROMINOS: true,
  DEBUG_PLAY_MUSIC: false,
};

export type Position = {
  readonly row: number;
  readonly col: number;
};

export enum CellState {
  Empty = "empty",
  Projection = "projection",
  Red = "red",
  Green = "green",
  LightGreen = "lightgreen",
  Pink = "pink",
  Orange = "orange",
  Yellow = "yellow",
  Purple = "purple",
}

export enum CollisionCheckResult {
  NoCollision,
  WallsOrFloorOrOtherTetromino,
  Ceiling,
}

export function createProjectionTetromino(tetromino: Matrix): Matrix {
  return tetromino.transform((_position, state) => {
    if (state === CellState.Empty) return state;

    return CellState.Projection;
  });
}

export function addPositions(a: Position, b: Position): Position {
  return {
    row: a.row + b.row,
    col: a.col + b.col,
  };
}

export function calculateNextFallTickInterval(
  fallTickInterval: number,
  rowsCleared: number
): number {
  const percentageIncrease =
    (rowsCleared * Const.SPEED_INCREASE_PERCENT_PER_ROW) / 100;

  return Math.max(
    Const.MIN_FALL_INVERVAL,
    fallTickInterval - fallTickInterval * percentageIncrease
  );
}

export function calculateMiddleCol(
  cols: number,
  tetrominoCols: number
): number {
  const middleCol = Math.floor(cols / 2);
  const tetrominoMiddleCol = Math.floor(tetrominoCols / 2);

  return middleCol - tetrominoMiddleCol;
}

function wouldCollideWithWalls(
  simulatedPosition: Position,
  tetrominoCols: number,
  boardCols: number
): boolean {
  return (
    simulatedPosition.col < 0 ||
    simulatedPosition.col + tetrominoCols > boardCols
  );
}

function wouldCollideWithFloor(
  simulatedPosition: Position,
  tetrominoRows: number,
  boardRows: number
): boolean {
  return simulatedPosition.row + tetrominoRows > boardRows;
}

function wouldCollideWithOtherTetromino(
  virtualBoard: Matrix,
  tetromino: Matrix,
  simulatedPosition: Position
): boolean {
  let collided = false;
  tetromino.iter(({row, col}, state) => {
    if (state === CellState.Empty || state === CellState.Projection) {
      return;
    }

    const boardRow = row + simulatedPosition.row;
    const boardCol = col + simulatedPosition.col;
    const boardCell = virtualBoard.unwrap()[boardRow][boardCol];

    if (boardCell !== CellState.Empty && boardCell !== CellState.Projection) {
      collided = true;
    }
  });
  return collided;
}

export function wouldCollide(
  board: Matrix,
  tetromino: Matrix,
  tetrominoPosition: Position,
  delta: Position = {row: 0, col: 0}
): CollisionCheckResult {
  const virtualBoard = board.clearMask(tetromino, tetrominoPosition);
  const simulatedPosition = {
    row: tetrominoPosition.row + delta.row,
    col: tetrominoPosition.col + delta.col,
  };

  if (
    wouldCollideWithWalls(
      simulatedPosition,
      tetromino.cols,
      virtualBoard.cols
    )
  ) {
    return CollisionCheckResult.WallsOrFloorOrOtherTetromino;
  }

  if (
    wouldCollideWithFloor(
      simulatedPosition,
      tetromino.rows,
      virtualBoard.rows
    )
  ) {
    return CollisionCheckResult.WallsOrFloorOrOtherTetromino;
  }

  const collidedWithCell = wouldCollideWithOtherTetromino(
    virtualBoard,
    tetromino,
    simulatedPosition
  );

  if (tetrominoPosition.row === 0 && collidedWithCell) {
    return CollisionCheckResult.Ceiling;
  }

  return collidedWithCell
    ? CollisionCheckResult.WallsOrFloorOrOtherTetromino
    : CollisionCheckResult.NoCollision;
}

export function couldMove(
  delta: Position,
  board: Matrix,
  tetromino: Matrix,
  tetrominoPosition: Position
): boolean {
  return (
    wouldCollide(board, tetromino, tetrominoPosition, delta) ===
    CollisionCheckResult.NoCollision
  );
}

export function projectRow(
  board: Matrix,
  tetromino: Matrix,
  tetrominoPosition: Position
): number {
  const projectionPosition = {...tetrominoPosition};

  // Move as far down as possible.
  while (couldMove({row: 1, col: 0}, board, tetromino, projectionPosition))
    projectionPosition.row += 1;

  return projectionPosition.row;
}

function createInitialState(): State {
  const initialTetromino = Tetromino.random;
  const middleCol = calculateMiddleCol(
    Const.BOARD_COLS,
    initialTetromino.cols
  );
  const initialTetrominoPosition: Position = {row: 0, col: middleCol};

  const initialProjectionRow = projectRow(
    new Matrix(Const.BOARD_ROWS, Const.BOARD_COLS),
    initialTetromino,
    initialTetrominoPosition
  );

  const initialProjectionPosition: Position = {
    row: initialProjectionRow,
    col: middleCol,
  };

  const initialBoard = new Matrix(Const.BOARD_ROWS, Const.BOARD_COLS)
    .insert(
      createProjectionTetromino(initialTetromino),
      initialProjectionPosition
    )
    .insert(initialTetromino, initialTetrominoPosition);

  return new State({
    board: initialBoard,
    tetromino: initialTetromino,
    tetrominoPosition: initialTetrominoPosition,
    projectionPosition: initialProjectionPosition,
    fallTickInterval: Const.INITIAL_FALL_TICK_INTERVAL,
    score: 0,
    isPaused: Const.IS_DEBUG_MODE && Const.IS_DEBUG_PAUSED,
    combo: 0,
  });
}

window.addEventListener("load", () => {
  console.log("Game logic loaded");

  const $board = document.querySelector(Const.BOARD_SELECTOR)!;

  dom.createBoardCells().forEach(($cell) => $board.appendChild($cell));
  console.log(
    `Initialized HTML board (\${Const.BOARD_COLS}x\${Const.BOARD_ROWS})`
  );

  // Setup effects, animations, and audio.
  effects.playInitializationEffectSequence();
  util.preloadAudios(Object.values(util.Sound));

  let state = createInitialState();

  // Initial render.
  dom.render(state);
  console.log("Initial render");

  const createFallTickInterval = (interval: number) =>
    setInterval(() => {
      state = gameEvents.onFallTick(state);
      dom.render(state);
    }, interval);

  let fallTickIntervalHandle = state.isPaused
    ? -1
    : createFallTickInterval(state.fallTickInterval);

  window.addEventListener("keydown", (event) => {
    let nextState = null;

    // TODO: Handle out of bounds. Simply ignore if it would go out of bounds (use a `constrain` helper function).
    switch (event.key) {
      case "ArrowLeft":
        nextState = state.choose(
          playerEvents.onPlayerHorizontalShiftInput(state, true)
        );
        break;
      case "ArrowRight":
        nextState = state.choose(
          playerEvents.onPlayerHorizontalShiftInput(state, false)
        );
        break;
      case "ArrowUp":
        nextState = state.choose(playerEvents.onPlayerRotateInput(state));
        break;
      case " ":
        nextState = state.choose(playerEvents.onPlayerPlacementInput(state));
        break;
    }

    if (!state.isPaused && nextState !== null) {
      // FIXME: What happens if there was some time in between lost? Ie. when clearing and re-assigning it, it would technically not be precise, and not respect previous interval time left on the previous fall tick interval?
      // Reset the fall tick interval if it changed between states.
      if (nextState.fallTickInterval !== state.fallTickInterval) {
        clearInterval(fallTickIntervalHandle);
        fallTickIntervalHandle = createFallTickInterval(
          nextState.fallTickInterval
        );
      }

      state = nextState;
      dom.render(state);
    }
  });
});
