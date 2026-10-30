/* Print rendering is independent of game state and never changes a saved game. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const colors = {G:'#82bc83',Y:'#f1d968',B:'#8bbfda',R:'#e59591',O:'#eeb77b'};
  let board;
  try { board = JSON.parse(localStorage.getItem('ancora-print-board')); } catch { /* Show recovery message below. */ }
  const isValidBoard = value => Array.isArray(value) && value.length === 7 && value.every(row => Array.isArray(row) && row.length === 15 && row.every(cell => cell && Object.hasOwn(colors,cell.color) && typeof cell.star === 'boolean'));
  const first = [5,3,3,3,2,2,2,1,2,2,2,3,3,3,5];
  const second = [3,2,2,2,1,1,1,0,1,1,1,2,2,2,3];
  function encodeBoard(layout) {
    const codes = 'GYBRO';
    const bytes = new Uint8Array(53);
    layout.flat().forEach((cell,i) => { const value = codes.indexOf(cell.color) | (cell.star ? 8 : 0); bytes[i >> 1] |= value << (i % 2 ? 0 : 4); });
    const checksum = bytes.reduce((sum,b) => (sum * 31 + b) & 65535, 0);
    return 'A1-' + btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') + '-' + checksum.toString(16).padStart(4,'0').toUpperCase();
  }
  function decodeBoard(code) {
    const match = code.trim().match(/^A1-([A-Za-z0-9_-]{71})-([A-Fa-f0-9]{4})$/i);
    if (!match) throw Error('Invalid board code format.');
    const raw = atob(match[1].replace(/-/g,'+').replace(/_/g,'/')+'=');
    const bytes = Uint8Array.from(raw, ch => ch.charCodeAt(0));
    if (bytes.length!==53 || (bytes[52]&15)!==0 || bytes.reduce((sum,b)=>(sum*31+b)&65535,0)!==parseInt(match[2],16)) throw Error('Board code is damaged. Check every character.');
    if (btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') !== match[1]) throw Error('Board code is damaged. Check every character.');
    const codes='GYBRO', cells=[];
    for(let i=0;i<105;i++) {const v=(bytes[i>>1] >> (i%2?0:4))&15; if ((v&7)>4) throw Error('Board code contains an invalid cell.'); cells.push({color:codes[v&7],star:!!(v&8)});}
    return Array.from({length:7},(_,r)=>cells.slice(r*15,r*15+15));
  }
  function artwork(cardWidthUnits) {
    const gray = $('grayscale').checked;
    const fill = color => gray ? '#f0f0f0' : $('color-'+color).value;
    const letter = color => color;
    const box = (x,y,w,h,value,background='#ffffff') => `<rect class="score-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${background}" stroke="#849083" stroke-width="1"/><text x="${x+w/2}" y="${y+h/2}" dominant-baseline="central" text-anchor="middle" font-size="27" font-weight="bold">${value}</text>`;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" viewBox="0 0 ${cardWidthUnits} 760" role="img" aria-label="Blank Ancora score board"><rect x="0" y="0" width="${cardWidthUnits}" height="760" fill="#fffef9"/><g font-family="Arial,sans-serif" fill="#233b30"><rect x="25" y="9" width="190" height="50" rx="12" fill="#244c3d"/><text x="37" y="46" font-size="38" font-weight="900" letter-spacing="-1" fill="#fffef9">ancora<tspan fill="#f1d968">!</tspan></text><path d="M228 35H743" stroke="#b8c1b0"/>`;
    for(let c=0;c<15;c++) { s += box(27+c*48,68,44,44,c===7?'':String.fromCharCode(65+c),'#f5f6f0'); if(c===7) s+=`<text x="${49+c*48}" y="98" text-anchor="middle" fill="#c52626" font-size="24" font-weight="900">H</text>`; }
    board.forEach((row,r) => row.forEach((cell,c) => {
      const x=25+c*48,y=120+r*48;
      s+=`<rect x="${x}" y="${y}" width="48" height="48" fill="${fill(cell.color)}" stroke="#ffffff" stroke-width="1"/>`;
      if(gray) s+=`<text class="color-letter" x="${x+5}" y="${y+16}" font-size="14" font-weight="bold">${letter(cell.color)}</text>`;
      if(cell.star) s+=`<path transform="translate(${x+24},${y+24})" d="M0 -9 2.6 -3 9 -3 4 1 6 8 0 4 -6 8 -4 1 -9 -3 -2.6 -3Z" fill="#233b30"/>`;
    }));
    board.forEach((row,r)=>row.forEach((cell,c)=> {
      const x=25+c*48,y=120+r*48;
      const edge=(dx,dy)=>r+dy<0||r+dy>=7||c+dx<0||c+dx>=15||board[r+dy][c+dx].color!==cell.color;
      if(edge(0,-1)) s+=`<path d="M${x} ${y}h48" stroke="#52645a" stroke-width="2"/>`;
      if(edge(-1,0)) s+=`<path d="M${x} ${y}v48" stroke="#52645a" stroke-width="2"/>`;
      if(r===6) s+=`<path d="M${x} ${y+48}h48" stroke="#52645a" stroke-width="2"/>`;
      if(c===14) s+=`<path d="M${x+48} ${y}v48" stroke="#52645a" stroke-width="2"/>`;
    }));
    for(let c=0;c<15;c++) {
      s+=box(27+c*48,470,44,44,first[c]);
      s+=box(27+c*48,520,44,44,second[c]);
    }
    s+='<text x="220" y="595" font-size="10">COLUMN BONUS · FIRST / SECOND</text>';
    const right = cardWidthUnits-28;
    s+=`<path d="M780 24V736" stroke="#b8c1b0"/><text x="799" y="60" font-size="24" font-weight="bold">COLOUR BONUS</text><text x="${right-76}" y="88" text-anchor="middle" font-size="10">FIRST</text><text x="${right-21}" y="88" text-anchor="middle" font-size="10">SECOND</text>`;
    Object.keys(colors).forEach((color,i)=> {
      const y=98+i*52;
      s+=`<rect x="804" y="${y}" width="42" height="42" rx="4" fill="${fill(color)}" stroke="#849083"/>`;
      if(gray) s+=`<text class="color-letter" x="825" y="${y+26}" text-anchor="middle" font-size="16" font-weight="bold">${letter(color)}</text>`;
      s+=box(right-97,y,42,42,5)+box(right-42,y,42,42,3);
    });
    s+='<text x="799" y="382" font-size="23" font-weight="bold">JOKERS</text>';
    const jokerRadius = Math.min(13,(right-799)/18);
    for(let i=0;i<8;i++) s+=`<circle cx="${799+jokerRadius+i*(right-799-2*jokerRadius)/7}" cy="405" r="${jokerRadius}" fill="white" stroke="#586957"/>`;
    s+=`<path d="M799 426H${right}" stroke="#b8c1b0"/><text x="799" y="450" font-size="23" font-weight="bold">SCORE</text>`;
    const labels=['COLUMNS','COLORS','JOKERS LEFT','STARS × −2','TOTAL'];
    labels.forEach((label,i)=> {
      const y=465+i*52;
      s+=`<text x="799" y="${y+27}" font-size="22" font-weight="bold" textLength="${Math.min(label.length*13,right-870)}" lengthAdjust="spacingAndGlyphs">${label}</text>`;
      s+=box(right-60,y,60,40,'',i===4?'#e4ecdf':'#ffffff');
    });
    const code = encodeBoard(board);
    s+='<path d="M220 612H743" stroke="#b8c1b0"/><text x="220" y="634" font-size="22" font-weight="bold">BOARD CODE</text>';
    s+=`<text x="220" y="660" font-family="monospace" font-size="21" font-weight="bold" textLength="510" lengthAdjust="spacingAndGlyphs">${code.slice(0,40)}</text><text x="220" y="685" font-family="monospace" font-size="21" font-weight="bold" textLength="510" lengthAdjust="spacingAndGlyphs">${code.slice(40)}</text>`;
    s+='<text x="220" y="711" font-size="14">Scan to copy this code, or enter it in Print Studio.</text>';
    // Align the visible QR modules with the grid; preserve the QR's white quiet zone.
    const qrSize = 180;
    const qrX = 25 - qrSize * 4 / (AncoraQR.matrix(code).length + 8);
    s+=AncoraQR.svg(code).replace('<svg ', `<svg x="${qrX}" y="578" width="${qrSize}" height="${qrSize}" `);
    s+='</g></svg>';
    return gray ? s.replace('<svg ', '<svg style="filter:grayscale(1)" ') : s;
  }
  function update() {
    $('custom').hidden=$('paper').value!=='custom';
    $('width').disabled=$('height').disabled=$('paper').value!=='custom';
    if(!isValidBoard(board)) {$('status').textContent='No board available. Enter a board code or open the game and choose Print / PDF.';$('print').disabled=true;return;}
    $('current-code').value=encodeBoard(board);
    const form=$('settings');
    if(!form.checkValidity()) {$('status').textContent='Check the paper and grid values.';$('print').disabled=true;return;}
    let [w,h]=$('paper').value==='custom'?[+$('width').value,+$('height').value]:$('paper').value.split(',').map(Number);
    if($('orientation').value==='landscape') [w,h]=[Math.max(w,h),Math.min(w,h)];
    else [w,h]=[Math.min(w,h),Math.max(w,h)];
    const cols=+$('columns').value,rows=+$('rows').value,margin=+$('margin').value,gap=+$('gap').value;
    const cw=(w-2*margin-(cols-1)*gap)/cols,ch=(h-2*margin-(rows-1)*gap)/rows;
    if(cw<=0||ch<=0){$('status').textContent='This grid does not fit. Reduce the margin, gap, or grid count.';$('print').disabled=true;return;}
    const cardWidth=Math.min(cw,ch*1000/760),cellSize=Math.min(cw/1000,ch/760)*50;
    $('status').textContent=cellSize<3.5?'These boards are very small. Fewer rows or columns will make them easier to play.':`${cols*rows} identical boards. Blank copies keep your game progress untouched.`;
    $('print').disabled=false;
    $('summary').textContent=`${w} × ${h} mm · ${cols} × ${rows}`;
    const sheet=$('sheet');
    Object.assign(sheet.style,{width:`${w}mm`,height:`${h}mm`,padding:`${margin}mm`,gap:`${gap}mm`,gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,gridTemplateRows:`repeat(${rows},minmax(0,1fr))`});
    sheet.classList.toggle('guides',$('guides').checked);
    const artworkWidth = $('scaling').value === 'fill' ? Math.max(1000,cw/ch*760) : 1000;
    const image=artwork(artworkWidth);
    sheet.innerHTML=Array.from({length:cols*rows},()=>`<div class="card" style="width:${$('scaling').value==='fill'?cw:cardWidth}mm;height:${$('scaling').value==='fill'?ch:cardWidth*760/1000}mm">${image}</div>`).join('');
    const sharedCuts = gap === 0 && $('scaling').value === 'fill';
    sheet.classList.toggle('shared-cuts', sharedCuts);
    if (sharedCuts && $('guides').checked) {
      const innerW=w-2*margin,innerH=h-2*margin;
      let lines='';
      for(let c=1;c<cols;c++) lines+=`<path d="M${c*cw} 0V${innerH}"/>`;
      for(let r=1;r<rows;r++) lines+=`<path d="M0 ${r*ch}H${innerW}"/>`;
      sheet.insertAdjacentHTML('beforeend',`<svg class="cut-grid" aria-hidden="true" viewBox="0 0 ${innerW} ${innerH}" preserveAspectRatio="none" style="left:${margin}mm;top:${margin}mm;width:${innerW}mm;height:${innerH}mm"><g fill="none" stroke="#949b91" stroke-width="0.15" stroke-dasharray="1 1">${lines}</g></svg>`);
    }
    $('paper-style').textContent=`@page { size: ${w}mm ${h}mm; margin: 0; }`;
    fitPreview();
  }
  function fitPreview(){const sheet=$('sheet');sheet.style.zoom=1;sheet.style.zoom=Math.min(1,Math.max(0.1,($('preview').clientWidth-20)/(sheet.offsetWidth||1)));}
  $('new-board').addEventListener('click', async () => {
    const button=$('new-board');
    button.disabled=true;
    $('generation-status').textContent='Generating a new board…';
    try {
      const fresh=await window.generatePrintBoard();
      if (!isValidBoard(fresh)) throw new Error('Generated board is invalid.');
      localStorage.setItem('ancora-print-board',JSON.stringify(fresh));
      board=fresh;
      $('generation-status').textContent='New board ready. Your current game is unchanged.';
      update();
    } catch (error) { $('generation-status').textContent='Could not generate a board. Please try again.'; }
    finally { button.disabled=false; }
  });
  $('restore-board').addEventListener('click', () => {
    try {
      const restored=decodeBoard($('board-code').value.replace(/\s/g,''));
      localStorage.setItem('ancora-print-board',JSON.stringify(restored));
      board=restored;
      $('code-message').textContent='Board restored for printing.';
      update();
    } catch (error) { $('code-message').textContent=error.message || 'Invalid board code.'; }
  });
  $('copy-code').addEventListener('click', async () => {
    if (!isValidBoard(board)) return;
    try { await navigator.clipboard.writeText(encodeBoard(board)); $('code-message').textContent='Board code copied.'; }
    catch { $('current-code').focus(); $('current-code').select(); $('code-message').textContent='Select and copy the board code above.'; }
  });
  $('settings').addEventListener('input',event => {
    if (event.target.id !== 'board-code' && event.target.id !== 'current-code') update();
  });
  $('settings').addEventListener('submit',event=>event.preventDefault());
  $('print').addEventListener('click',()=>{update();if(!$('print').disabled)window.print();});
  window.addEventListener('resize',fitPreview);
  update();
})();


