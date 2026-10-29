/* Shared game board generator adapted from index.html. */
(() => {
  'use strict';
  const ROWS=7,COLS=15,COLORS=['G','Y','B','R','O'];
  let gameState={grid:[]};
        function createInitialConstraintGrid() {
            let g = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
            let colorPool = [];
            COLORS.forEach(c => { for(let i=0; i<6; i++) colorPool.push(c); });
            for (let c = 0; c < COLS; c++) {
                let colColors = [...COLORS];
                colColors.push(colorPool.pop(), colorPool.pop());
                colColors.sort(() => Math.random() - 0.5);
                for(let r=0; r<ROWS; r++) g[r][c] = colColors[r];
            }
            return g;
        }

        function isValidSwap(g, r1, c1, r2, c2) {
            if (c1 === c2) return true;
            let cA = g[r1][c1], cB = g[r2][c2];
            if (cA === cB) return true;
            let countA = 0, countB = 0;
            for(let r=0; r<7; r++) {
                if(g[r][c1] === cA) countA++;
                if(g[r][c2] === cB) countB++;
            }
            if (countA === 1 || countB === 1) return false; 
            return true;
        }

        function evaluateGrid(g) {
            let score = 0;
            let visited = new Uint8Array(105);
            let blockIdGrid = new Int16Array(105);
            let targets = [6,5,4,3,2,1];
            let blockId = 0;

            for (let cIdx = 0; cIdx < 5; cIdx++) {
                let c = COLORS[cIdx];
                let blocks = [];
                for (let i = 0; i < 105; i++) {
                    let r = Math.floor(i / 15), col = i % 15;
                    if (g[r][col] === c && !visited[i]) {
                        let size = 0, q = [i], head = 0;
                        visited[i] = 1;
                        while (head < q.length) {
                            let curr = q[head++]; size++;
                            blockIdGrid[curr] = blockId;
                            let cr = Math.floor(curr / 15), cc = curr % 15;
                            if (cr > 0 && g[cr-1][cc] === c && !visited[curr-15]) { visited[curr-15]=1; q.push(curr-15); }
                            if (cr < 6 && g[cr+1][cc] === c && !visited[curr+15]) { visited[curr+15]=1; q.push(curr+15); }
                            if (cc > 0 && g[cr][cc-1] === c && !visited[curr-1]) { visited[curr-1]=1; q.push(curr-1); }
                            if (cc < 14 && g[cr][cc+1] === c && !visited[curr+1]) { visited[curr+1]=1; q.push(curr+1); }
                        }
                        blocks.push(size);
                        blockId++;
                    }
                }
                blocks.sort((a,b) => b-a);
                for (let i=0; i < Math.max(blocks.length, 6); i++) {
                    let bv = i < blocks.length ? blocks[i] : 0;
                    let tv = i < 6 ? targets[i] : 0;
                    score += Math.abs(bv - tv) * 10;
                }
            }

            for (let col=0; col<15; col++) {
                let colBlocks = [[], [], [], [], []];
                for (let r=0; r<7; r++) {
                    let cIdx = COLORS.indexOf(g[r][col]);
                    let bId = blockIdGrid[r * 15 + col];
                    if (!colBlocks[cIdx].includes(bId)) colBlocks[cIdx].push(bId);
                }
                for (let i=0; i<5; i++) {
                    if (colBlocks[i].length > 1) score += (colBlocks[i].length - 1) * 30; 
                }
            }
            return score;
        }

        function copyGrid(g) { return g.map(row => [...row]); }

        function assignBacktrackingStars() {
            let blockIds = Array(ROWS).fill(0).map(()=>Array(COLS).fill(-1));
            let blockId = 0;
            for (let r=0; r<ROWS; r++) {
                for (let c=0; c<COLS; c++) {
                    if (blockIds[r][c] === -1) {
                        let color = gameState.grid[r][c].color;
                        let q = [[r,c]]; blockIds[r][c] = blockId; let head = 0;
                        while(head < q.length) {
                            let [cr, cc] = q[head++];
                            [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
                                let nr=cr+dr, nc=cc+dc;
                                if (nr>=0 && nr<ROWS && nc>=0 && nc<COLS && gameState.grid[nr][nc].color === color && blockIds[nr][nc] === -1) {
                                    blockIds[nr][nc] = blockId; q.push([nr,nc]);
                                }
                            });
                        }
                        blockId++;
                    }
                }
            }

            let colorCounts = { 'G':0, 'Y':0, 'B':0, 'R':0, 'O':0 };
            let blockHasStar = new Set();
            let rowOrders = Array(COLS).fill(0).map(() => [0,1,2,3,4,5,6].sort(() => Math.random() - 0.5));

            function backtrack(col) {
                if (col === COLS) return true;
                for (let i=0; i<ROWS; i++) {
                    let r = rowOrders[col][i];
                    let cell = gameState.grid[r][col];
                    let cColor = cell.color, bId = blockIds[r][col];
                    
                    if (colorCounts[cColor] < 3 && !blockHasStar.has(bId)) {
                        cell.star = true; colorCounts[cColor]++; blockHasStar.add(bId);
                        if (backtrack(col + 1)) return true;
                        cell.star = false; colorCounts[cColor]--; blockHasStar.delete(bId);
                    }
                }
                return false;
            }

            gameState.grid.forEach(row => row.forEach(cell => cell.star = false));
            let success = backtrack(0);
            
            if (!success) {
                let starPool = []; COLORS.forEach(c => { for(let i=0; i<3; i++) starPool.push(c); });
                starPool.sort(()=>Math.random()-0.5);
                for (let c=0; c<COLS; c++) {
                    let targetC = starPool[c]; let matches = [];
                    for(let r=0; r<ROWS; r++) if(gameState.grid[r][c].color === targetC) matches.push(gameState.grid[r][c]);
                    if(matches.length > 0) matches[Math.floor(Math.random()*matches.length)].star = true;
                    else gameState.grid[Math.floor(Math.random()*ROWS)][c].star = true;
                }
            }
        }


  window.generatePrintBoard = async () => {
    let grid=createInitialConstraintGrid();
    let currentScore=evaluateGrid(grid), bestGrid=copyGrid(grid), bestScore=currentScore;
    let temp=100, iterations=0;
    while (bestScore>0 && iterations<100000) {
      for(let i=0;i<2000 && bestScore>0;i++) {
        let r1=Math.floor(Math.random()*ROWS),c1=Math.floor(Math.random()*COLS),r2=Math.floor(Math.random()*ROWS),c2=Math.floor(Math.random()*COLS);
        if(grid[r1][c1]!==grid[r2][c2] && isValidSwap(grid,r1,c1,r2,c2)) {
          let tmp=grid[r1][c1]; grid[r1][c1]=grid[r2][c2]; grid[r2][c2]=tmp;
          let score=evaluateGrid(grid);
          if(score<currentScore || Math.exp((currentScore-score)/temp)>Math.random()) {
            currentScore=score;
            if(score<bestScore) {bestScore=score;bestGrid=copyGrid(grid);}
          } else {grid[r2][c2]=grid[r1][c1];grid[r1][c1]=tmp;}
        }
        temp*=0.9995;iterations++;
      }
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    gameState.grid=bestGrid.map((row,r)=>row.map((color,c)=>({color,star:false,r,c})));
    assignBacktrackingStars();
    return gameState.grid.map(row=>row.map(({color,star})=>({color,star})));
  };
})();
