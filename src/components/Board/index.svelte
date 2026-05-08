<script>
	import { BOX_SIZE } from '@sudoku/constants';
	import { gamePaused } from '@sudoku/stores/game';
	import { grid, userGrid, invalidCells, gameStore } from '@sudoku/stores/grid';
	import { settings } from '@sudoku/stores/settings';
	import { cursor } from '@sudoku/stores/cursor';
	import { candidates } from '@sudoku/stores/candidates';
	import Cell from './Cell.svelte';

	// 直接使用 derived store，确保探索模式下棋盘实时刷新
	const exploreGrid = gameStore.exploreGrid;
	const exploreInvalidCells = gameStore.exploreInvalidCells;

	function isSelected(cursorStore, x, y) {
		return cursorStore.x === x && cursorStore.y === y;
	}

	function isSameArea(cursorStore, x, y) {
		if (cursorStore.x === null && cursorStore.y === null) return false;
		if (cursorStore.x === x || cursorStore.y === y) return true;

		const cursorBoxX = Math.floor(cursorStore.x / BOX_SIZE);
		const cursorBoxY = Math.floor(cursorStore.y / BOX_SIZE);
		const cellBoxX = Math.floor(x / BOX_SIZE);
		const cellBoxY = Math.floor(y / BOX_SIZE);
		return (cursorBoxX === cellBoxX && cursorBoxY === cellBoxY);
	}

	function getValueAtCursor(gridStore, cursorStore) {
		if (cursorStore.x === null && cursorStore.y === null) return null;

		return gridStore[cursorStore.y][cursorStore.x];
	}

	// 探索模式状态
	$: exploring = $gameStore ? $gameStore.isExploring() : false;

</script>

<div class="board-padding relative z-10">
	<div class="max-w-xl relative">
		<div class="w-full" style="padding-top: 100%"></div>
	</div>
	<div class="board-padding absolute inset-0 flex justify-center">

		<div class="bg-white shadow-2xl rounded-xl overflow-hidden w-full h-full max-w-xl grid relative" class:bg-gray-200={$gamePaused} class:explore-active={exploring}>
			{#if exploring}
				<div class="explore-indicator">
					<span class="explore-badge">探索模式</span>
					{#if $exploreInvalidCells.length > 0}
						<span class="explore-conflict">冲突！请回退或放弃</span>
					{/if}
				</div>
			{/if}
			{#if exploring}
				<!-- 探索模式：渲染探索棋盘 -->
				{#each $exploreGrid as row, y}
					{#each row as value, x}
						<Cell {value}
						      cellY={y + 1}
						      cellX={x + 1}
						      candidates={$candidates[x + ',' + y]}
						      disabled={$gamePaused}
						      selected={isSelected($cursor, x, y)}
						      userNumber={$grid[y][x] === 0}
						      sameArea={$settings.highlightCells && !isSelected($cursor, x, y) && isSameArea($cursor, x, y)}
						      sameNumber={$settings.highlightSame && value && !isSelected($cursor, x, y) && getValueAtCursor($exploreGrid, $cursor) === value}
						      conflictingNumber={$settings.highlightConflicting && $exploreInvalidCells.includes(x + ',' + y)} />
					{/each}
				{/each}
			{:else}
				<!-- 正常模式：渲染主棋盘 -->
				{#each $userGrid as row, y}
					{#each row as value, x}
						<Cell {value}
						      cellY={y + 1}
						      cellX={x + 1}
						      candidates={$candidates[x + ',' + y]}
						      disabled={$gamePaused}
						      selected={isSelected($cursor, x, y)}
						      userNumber={$grid[y][x] === 0}
						      sameArea={$settings.highlightCells && !isSelected($cursor, x, y) && isSameArea($cursor, x, y)}
						      sameNumber={$settings.highlightSame && value && !isSelected($cursor, x, y) && getValueAtCursor($userGrid, $cursor) === value}
						      conflictingNumber={$settings.highlightConflicting && $grid[y][x] === 0 && $invalidCells.includes(x + ',' + y)} />
					{/each}
				{/each}
			{/if}
		</div>

	</div>
</div>

<style>
	.board-padding {
		@apply px-4 pb-4;
	}

	.explore-active {
		box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.6);
	}

	.explore-indicator {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 0.5rem;
		pointer-events: none;
	}

	.explore-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		color: white;
		background-color: rgba(59, 130, 246, 0.8);
	}

	.explore-conflict {
		margin-top: 0.25rem;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		color: white;
		background-color: rgba(239, 68, 68, 0.9);
	}
</style>