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
  function artwork() {
    const gray = $('grayscale').checked;
    const fill = color => gray ? '#f0f0f0' : $('color-'+color).value;
    const letter = color => color;
    const box = (x,y,w,h,value,background='#ffffff') => `<rect class="score-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${background}" stroke="#849083" stroke-width="1"/><text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" font-size="12" font-weight="bold">${value}</text>`;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 760" role="img" aria-label="Blank Ancora score board"><rect x="1" y="1" width="998" height="758" fill="#fffef9"/><g font-family="Arial,sans-serif" fill="#233b30"><text x="28" y="45" font-size="30" font-weight="900">ancora!</text><path d="M28 61H972" stroke="#b8c1b0"/><text x="28" y="84" font-size="12">PLAYER _______________________</text>';
    for(let c=0;c<15;c++) { s += box(23+c*48,98,42,42,c===7?'':String.fromCharCode(65+c),'#f5f6f0'); if(c===7) s+=`<text x="${44+c*48}" y="125" text-anchor="middle" fill="#c52626" font-size="22" font-weight="900">H</text>`; }
    board.forEach((row,r) => row.forEach((cell,c) => {
      const x=23+c*48,y=147+r*48;
      s+=`<rect x="${x}" y="${y}" width="48" height="48" fill="${fill(cell.color)}" stroke="#ffffff" stroke-width="1"/>`;
      if(gray) s+=`<text class="color-letter" x="${x+5}" y="${y+12}" font-size="10" font-weight="bold">${letter(cell.color)}</text>`;
      if(cell.star) s+=`<path transform="translate(${x+24},${y+24})" d="M0 -9 2.6 -3 9 -3 4 1 6 8 0 4 -6 8 -4 1 -9 -3 -2.6 -3Z" fill="#233b30"/>`;
    }));
    board.forEach((row,r)=>row.forEach((cell,c)=> {
      const x=23+c*48,y=147+r*48;
      const edge=(dx,dy)=>r+dy<0||r+dy>=7||c+dx<0||c+dx>=15||board[r+dy][c+dx].color!==cell.color;
      if(edge(0,-1)) s+=`<path d="M${x} ${y}h48" stroke="#52645a" stroke-width="2"/>`;
      if(edge(-1,0)) s+=`<path d="M${x} ${y}v48" stroke="#52645a" stroke-width="2"/>`;
      if(r===6) s+=`<path d="M${x} ${y+48}h48" stroke="#52645a" stroke-width="2"/>`;
      if(c===14) s+=`<path d="M${x+48} ${y}v48" stroke="#52645a" stroke-width="2"/>`;
    }));
    for(let c=0;c<15;c++) {
      s+=box(23+c*48,490,42,42,first[c]);
      s+=box(23+c*48,536,42,42,second[c]);
    }
    s+='<text x="28" y="595" font-size="10">COLUMN BONUS · FIRST / SECOND</text>';
    s+='<path d="M765 60V595" stroke="#b8c1b0"/><text x="785" y="84" font-size="18" font-weight="bold">COLOR BONUS</text><text x="887" y="110" text-anchor="middle" font-size="10">FIRST</text><text x="935" y="110" text-anchor="middle" font-size="10">SECOND</text>';
    Object.keys(colors).forEach((color,i)=> {
      const y=118+i*48;
      s+=`<rect x="790" y="${y}" width="42" height="42" rx="4" fill="${fill(color)}" stroke="#849083"/>`;
      if(gray) s+=`<text class="color-letter" x="811" y="${y+26}" text-anchor="middle" font-size="16" font-weight="bold">${letter(color)}</text>`;
      s+=box(866,y,42,42,5)+box(914,y,42,42,3);
    });
    s+='<text x="785" y="382" font-size="16" font-weight="bold">JOKERS</text>';
    for(let i=0;i<8;i++) s+=`<circle cx="${795+i*22}" cy="400" r="8" fill="white" stroke="#586957"/>`;
    s+='<path d="M785 415H968" stroke="#b8c1b0"/><text x="785" y="435" font-size="16" font-weight="bold">SCORE</text>';
    const labels=['COLUMNS','COLORS','UNUSED JOKERS','UNMARKED ★ × −2','TOTAL'];
    labels.forEach((label,i)=> {
      const y=442+i*29;
      s+=`<text x="785" y="${y+19}" font-size="11" font-weight="bold">${label}</text>`;
      s+=box(905,y,60,26,'',i===4?'#e4ecdf':'#ffffff');
    });
    const code = encodeBoard(board);
    s+='<path d="M28 612H972" stroke="#b8c1b0"/><text x="28" y="635" font-size="14" font-weight="bold">BOARD CODE</text>';
    s+=`<text x="170" y="635" font-family="monospace" font-size="17" font-weight="bold">${code.slice(0,40)}</text><text x="170" y="660" font-family="monospace" font-size="17" font-weight="bold">${code.slice(40)}</text>`;
    s+='<text x="28" y="684" font-size="11">Scan to copy this code, or enter it in Print Studio.</text>';
    s+=AncoraQR.svg(code).replace('<svg ', '<svg x="806" y="606" width="148" height="148" ');
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
    const cardWidth=Math.min(cw,ch*1000/760),cellSize=Math.min(cw/1000,ch/760)*48;
    $('status').textContent=cellSize<3.5?'These boards are very small. Fewer rows or columns will make them easier to play.':`${cols*rows} identical boards. Blank copies keep your game progress untouched.`;
    $('print').disabled=false;
    $('summary').textContent=`${w} × ${h} mm · ${cols} × ${rows}`;
    const sheet=$('sheet');
    Object.assign(sheet.style,{width:`${w}mm`,height:`${h}mm`,padding:`${margin}mm`,gap:`${gap}mm`,gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,gridTemplateRows:`repeat(${rows},minmax(0,1fr))`});
    sheet.classList.toggle('guides',$('guides').checked);
    const image=artwork();
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

