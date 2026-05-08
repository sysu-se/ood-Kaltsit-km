class Sudoku {
  constructor(grid, fixed = null) {
    // 防御性深拷贝，防止外部修改影响内部
    this._grid = grid.map(row => [...row]);
    // 记录初始给定的数字位置（不可修改）
    // 如果是从JSON恢复，使用传入的fixed；否则根据grid计算
    this._fixed = fixed ? fixed.map(row => [...row]) : 
                  grid.map(row => row.map(val => val !== 0));
  }

  getGrid() {
    return this._grid.map(row => [...row]);
  }

  // 新增：获取固定标记网格
  getFixedGrid() {
    return this._fixed.map(row => [...row]);
  }

  // 新增：判断某个位置是否为初始给定数字
  isFixed(row, col) {
    return this._fixed[row][col];
  }

  guess(move) {
    const { row, col, value } = move;
    
    // 边界检查
    if (row < 0 || row > 8 || col < 0 || col > 8) {
      throw new Error(`Position out of bounds: (${row}, ${col})`);
    }
    
    // 新增：保护初始给定数字不被修改
    if (this._fixed[row][col] && value !== 0 && value !== null) {
      return; // 静默返回，不修改初始数字
    }

    // 允许的值：1-9，或0/null表示清空
    if (value !== null && value !== 0 && (value < 1 || value > 9)) {
      throw new Error(`Invalid value: ${value}`);
    }
    
    // 执行操作
    this._grid[row][col] = value === null ? 0 : value;
  }

  // 新增：获取所有冲突的格子坐标
  // 返回 Set，包含 "row,col" 格式的字符串
  getInvalidCells() {
    const invalid = new Set();
    
    // 检查行
    for (let r = 0; r < 9; r++) {
      const seen = new Map();
      for (let c = 0; c < 9; c++) {
        const val = this._grid[r][c];
        if (val !== 0) {
          if (seen.has(val)) {
            const [pr, pc] = seen.get(val);
            invalid.add(`${r},${c}`);
            invalid.add(`${pr},${pc}`);
          } else {
            seen.set(val, [r, c]);
          }
        }
      }
    }
    
    // 检查列
    for (let c = 0; c < 9; c++) {
      const seen = new Map();
      for (let r = 0; r < 9; r++) {
        const val = this._grid[r][c];
        if (val !== 0) {
          if (seen.has(val)) {
            const [pr, pc] = seen.get(val);
            invalid.add(`${r},${c}`);
            invalid.add(`${pr},${pc}`);
          } else {
            seen.set(val, [r, c]);
          }
        }
      }
    }
    
    // 检查3x3宫
    for (let boxR = 0; boxR < 3; boxR++) {
      for (let boxC = 0; boxC < 3; boxC++) {
        const seen = new Map();
        const startR = boxR * 3;
        const startC = boxC * 3;
        
        for (let r = startR; r < startR + 3; r++) {
          for (let c = startC; c < startC + 3; c++) {
            const val = this._grid[r][c];
            if (val !== 0) {
              if (seen.has(val)) {
                const [pr, pc] = seen.get(val);
                invalid.add(`${r},${c}`);
                invalid.add(`${pr},${pc}`);
              } else {
                seen.set(val, [r, c]);
              }
            }
          }
        }
      }
    }
    
    return invalid;
  }

  // 新增：判断是否已完成（填满且无冲突）
  isWon() {
    // 检查是否填满
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this._grid[r][c] === 0) return false;
      }
    }
    // 检查是否有冲突
    return this.getInvalidCells().size === 0;
  }


  // ==================== Hint 功能 ====================

  /**
   * 获取指定格子的候选数集合
   * 基于当前棋盘状态，计算该格子可以填入的所有不冲突数字
   * @param {number} row - 行号 0-8
   * @param {number} col - 列号 0-8
   * @returns {number[]} 候选数数组（已排序）
   */
  getCandidates(row, col) {
    // 越界检查
    if (row < 0 || row > 8 || col < 0 || col > 8) {
      throw new Error(`Position out of bounds: (${row}, ${col})`);
    }
    // 如果格子已经有值，返回空数组
    if (this._grid[row][col] !== 0) return [];

    const candidates = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // 排除行中已有的数字
    for (let c = 0; c < 9; c++) {
      const val = this._grid[row][c];
      if (val !== 0) candidates.delete(val);
    }

    // 排除列中已有的数字
    for (let r = 0; r < 9; r++) {
      const val = this._grid[r][col];
      if (val !== 0) candidates.delete(val);
    }

    // 排除 3x3 宫格中已有的数字
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        const val = this._grid[r][c];
        if (val !== 0) candidates.delete(val);
      }
    }

    return Array.from(candidates).sort((a, b) => a - b);
  }

  /**
   * 获取下一步提示（推定值）
   * 找到所有只有一个候选数的格子（唯一候选 = 确定解）
   * @returns {{row:number, col:number, value:number, candidates:number[], reason:string}|null}
   */
  getHint() {
    const hints = [];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this._grid[r][c] === 0) {
          const candidates = this.getCandidates(r, c);
          // 唯一候选数 = 推定值（最简单的 Hint 策略）
          if (candidates.length === 1) {
            hints.push({
              row: r,
              col: c,
              value: candidates[0],
              candidates,
              reason: 'only_candidate'
            });
          }
        }
      }
    }

    // 返回第一个推定值（未来可扩展策略）
    return hints.length > 0 ? hints[0] : null;
  }

  /**
   * 获取所有格子的候选数（用于候选提示 UI）
   * @returns {Object} 键为 "row,col"，值为候选数数组
   */
  getAllCandidates() {
    const result = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this._grid[r][c] === 0) {
          const cands = this.getCandidates(r, c);
          if (cands.length > 0) {
            result[`${r},${c}`] = cands;
          }
        }
      }
    }
    return result;
  }
  

  clone() {
    const newSudoku = new Sudoku(this._grid, this._fixed);
    return newSudoku;
  }

  toJSON() {
    return {
      grid: this._grid,
      fixed: this._fixed
    };
  }

  toString() {
    let result = '┌───────┬───────┬───────┐\n';
    for (let i = 0; i < 9; i++) {
      if (i === 3 || i === 6) {
        result += '├───────┼───────┼───────┤\n';
      }
      let row = '│ ';
      for (let j = 0; j < 9; j++) {
        const val = this._grid[i][j];
        row += (val === 0 ? '.' : val) + ' ';
        // 每3列加一个分隔
        if (j === 2 || j === 5) row += '│ ';
      }
      row += '│\n';
      result += row;
    }
    result += '└───────┴───────┴───────┘';
    return result;
  }
}


class Game {
  constructor({ sudoku }) {
    this._sudoku = sudoku;
    // 历史栈：存储 Sudoku 的快照
    this._history = [];
    // Redo 栈：存储被撤销的状态
    this._redoStack = [];
    
    // ==================== Explore 模式 ====================
    this._exploring = false;           // 是否在探索模式
    this._exploreSudoku = null;        // 探索中的 Sudoku 副本
    this._exploreSnapshot = null;      // 探索开始前的主局面快照
    this._exploreHistory = [];         // 探索的独立 history
    this._exploreRedoStack = [];       // 探索的独立 redo
    this._failedStates = new Set();    // 记忆失败的棋盘状态哈希
  }

  getSudoku() {
    return this._sudoku;
  }

  guess(move) {
    // 1. 保存当前状态到历史
    this._history.push(this._sudoku.clone());
    
    // 2. 执行操作
    this._sudoku.guess(move);
    
    // 3. 清空redo栈
    this._redoStack = [];
  }

  undo() {
    if (!this.canUndo()) return;
    
    // 1. 保存当前状态到redo栈
    this._redoStack.push(this._sudoku.clone());
    
    // 2. 从历史恢复上一个状态
    this._sudoku = this._history.pop();
  }

  redo() {
    if (!this.canRedo()) return;
    
    // 1. 保存当前状态到历史
    this._history.push(this._sudoku.clone());
    
    // 2. 从redo栈恢复
    this._sudoku = this._redoStack.pop();
  }

  canUndo() {
    return this._history.length > 0;
  }

  canRedo() {
    return this._redoStack.length > 0;
  }

  // ==================== Explore 模式 ====================

  /**
   * 进入探索模式
   * 保存当前主局面快照，创建探索副本
   */
  startExplore() {
    if (this._exploring) return;
    this._exploring = true;
    this._exploreSnapshot = this._sudoku.clone();
    this._exploreSudoku = this._sudoku.clone();
    this._exploreHistory = [];
    this._exploreRedoStack = [];
  }

  /** 是否在探索模式 */
  isExploring() {
    return this._exploring;
  }

  /** 获取探索中的 Sudoku（UI 渲染用） */
  getExploreSudoku() {
    return this._exploreSudoku;
  }

  /** 获取探索模式的独立 history（用于探索内 undo） */
  getExploreHistory() {
    return this._exploreHistory;
  }

  /**
   * 在探索模式下填入数字
   * @param {{row:number, col:number, value:number}} move
   * @returns {{status:'ok'|'conflict', invalidCells?:Set}}
   */
  exploreGuess(move) {
    if (!this._exploring) throw new Error('Not in explore mode');
    if (!this._exploreSudoku) throw new Error('Explore sudoku not initialized');

    // 保存探索历史
    this._exploreHistory.push(this._exploreSudoku.clone());
    this._exploreRedoStack = [];

    // 在探索副本上执行
    this._exploreSudoku.guess(move);

    // 检查是否冲突（探索失败）
    const invalid = this._exploreSudoku.getInvalidCells();
    if (invalid.size > 0) {
      // 记录这个失败状态
      const gridHash = this._hashGrid(this._exploreSudoku.getGrid());
      this._failedStates.add(gridHash);
      return { status: 'conflict', invalidCells: invalid };
    }

    // 检查是否探索到了一个已知失败的状态
    const gridHash = this._hashGrid(this._exploreSudoku.getGrid());
    if (this._failedStates.has(gridHash)) {
      return { status: 'conflict', invalidCells: invalid, knownFailure: true };
    }

    return { status: 'ok' };
  }

  /**
   * 提交探索结果
   * 将探索副本的当前状态合并到主局面
   */
  commitExplore() {
    if (!this._exploring) return;

    // 把当前主局面保存到 history（用于 undo 回退到探索前）
    this._history.push(this._sudoku.clone());
    this._redoStack = [];

    // 用探索副本替换主 Sudoku
    this._sudoku = this._exploreSudoku;

    this._exitExplore();
  }

  /**
   * 放弃探索结果
   * 恢复到探索前的快照
   */
  abortExplore() {
    if (!this._exploring) return;
    this._exitExplore();
  }

  /** 探索模式下的 undo */
  exploreUndo() {
    if (!this._exploring || this._exploreHistory.length === 0) return;
    this._exploreRedoStack.push(this._exploreSudoku.clone());
    this._exploreSudoku = this._exploreHistory.pop();
  }

  /** 探索模式下的 redo */
  exploreRedo() {
    if (!this._exploring || this._exploreRedoStack.length === 0) return;
    this._exploreHistory.push(this._exploreSudoku.clone());
    this._exploreSudoku = this._exploreRedoStack.pop();
  }

  canExploreUndo() {
    return this._exploring && this._exploreHistory.length > 0;
  }

  canExploreRedo() {
    return this._exploring && this._exploreRedoStack.length > 0;
  }

  /** 获取失败状态集合（用于 UI 记忆提示） */
  getFailedStates() {
    return this._failedStates;
  }

  /** 检查棋盘是否是已知的失败状态 */
  isFailedState(grid) {
    return this._failedStates.has(this._hashGrid(grid));
  }

  /** 内部：退出探索模式，清理状态 */
  _exitExplore() {
    this._exploring = false;
    this._exploreSudoku = null;
    this._exploreSnapshot = null;
    this._exploreHistory = [];
    this._exploreRedoStack = [];
  }

  /** 内部：计算棋盘哈希（用于记忆失败路径） */
  _hashGrid(grid) {
    return grid.map(r => r.join('')).join('|');
  }


  toJSON() {
    return {
      sudoku: this._sudoku.toJSON(),
      history: this._history.map(s => s.toJSON()),
      redoStack: this._redoStack.map(s => s.toJSON())
    };
  }
}

export function createSudoku(input) {
  return new Sudoku(input);
}

export function createSudokuFromJSON(json) {
  // 防御性检查
  if (!json) {
    throw new Error('Invalid JSON: null or undefined');
  }
  
  // 旧格式：纯数组 [[...], [...]]
  if (Array.isArray(json)) {
    return new Sudoku(json);
  }
  
  // 新格式：{grid: [[...]], fixed: [[...]]}
  if (json.grid && Array.isArray(json.grid)) {
    return new Sudoku(json.grid, json.fixed);
  }
  
  throw new Error('Invalid JSON format for Sudoku');
}

export function createGame({ sudoku }) {
  return new Game({ sudoku });
}


export function createGameFromJSON(json) {
  if (!json || !json.sudoku) {
    throw new Error('Invalid JSON for Game');
  }

  const sudoku = createSudokuFromJSON(json.sudoku);
  const game = new Game({ sudoku });
  
  // 恢复历史
  if (json.history && Array.isArray(json.history)) {
    game._history = json.history.map(h => createSudokuFromJSON(h));
  }
  if (json.redoStack && Array.isArray(json.redoStack)) {
    game._redoStack = json.redoStack.map(h => createSudokuFromJSON(h));
  }
  
  return game;
}