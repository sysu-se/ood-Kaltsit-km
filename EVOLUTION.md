# 设计演进说明

## 1. 提示功能的实现

### 1.1 核心接口

提示功能的核心计算逻辑放在 `Sudoku` 类中：

- `getCandidates(row, col)`：计算指定格子的候选数集合
- `getHint()`：找到所有只有一个候选数的格子（推定值），返回第一个
- `getAllCandidates()`：获取所有空格子的候选数

### 1.2 为什么 Hint 属于 Sudoku 而非 Game？

候选数计算只依赖当前棋盘状态（grid），不需要了解历史、会话或探索状态。根据单一职责原则：

- `Sudoku` = 棋盘状态的表示与推导
- `Game` = 会话管理与状态切换

如果 Hint 放在 `Game` 中，会造成 `Game` 膨胀，且违背了关注点分离。

---

## 2. 探索模式的实现

### 2.1 设计决策：快照与回滚

探索模式采用**快照+副本**方案：

- 进入探索时：深拷贝当前主局面，保存快照
- 探索中：在副本上操作，拥有独立 history
- 提交时：用探索副本替换主 Sudoku
- 放弃时：丢弃副本，恢复原局面


### 2.2 主局面与探索局面的关系

| 属性 | 说明 |
|------|------|
| **关系** | 复制对象（深拷贝），非共享引用 |
| **深拷贝** | 通过 `sudoku.clone()` 实现 |
| **提交合并** | 探索副本整体替换主 Sudoku |
| **放弃回滚** | 丢弃副本，恢复快照 |
| **冲突检测** | `getInvalidCells()` 实时检查 |

### 2.3 冲突与失败记忆

- 探索中填入数字后，立即检查冲突
- 冲突状态通过 `Set` 存储棋盘哈希（`hashGrid`）
- 再次到达相同状态时提示用户「此路不通」

---

## 3. History 结构的演进

### 3.1 Homework 1 的 History

线性栈结构：  
History Stack: [Sudoku快照, Sudoku快照, ...]  
Redo Stack:    [Sudoku快照, ...]

### 3.2 Homework 2 的 History

主 History 保持不变，探索模式拥有**独立的 History 栈**：

主局面:  
History: [snap1, snap2, ...]  
Redo:    [...]  

探索模式（启动时）:  
ExploreHistory: []  
ExploreRedo:    []  

探索模式（填入数字后）:  
ExploreHistory: [snap_before_guess]  
ExploreRedo:    []  

提交探索结果:  
主 History: [snap1, snap2, ..., 探索前主局面快照]  
主 Sudoku ← 探索副本  
探索状态清理  

---

## 4. Homework 1 的设计局限与反思

### 4.1 `Game.guess()` 的历史存储位置

HW1 中 `guess()` 先保存历史再执行操作，这意味着：

```js
guess(move) {
    this._history.push(this._sudoku.clone()); // 保存的是操作前的状态
    this._sudoku.guess(move);
    this._redoStack = [];
}
```

Undo 时 pop 出来的就是操作前的状态。HW2 保持了这个设计，因为它很适合探索模式的提交逻辑。

### 4.2 `toJSON()` 暴露内部引用

HW1 的 `toJSON()` 直接返回 `this._grid`（引用），存在被外部修改的风险。HW2 未修复此问题，但 `clone()` 和 `guess()` 中的防御性拷贝弥补了这一点。

### 4.3 如果重做 HW1

如果重新设计 HW1，会做以下改进：

1. `toJSON()` 返回深拷贝
2. `Sudoku` 增加 `equals(other)` 方法，便于比较
3. `Game` 的 history 使用不可变数据结构
4. 为 `Move` 设计专门的值对象类型