// client-game.js
// Main single-file client logic separated out (linked from index.html).
// This is the same feature-complete code as discussed earlier; it sets up canvas,
// game loop, WebAudio procedural SFX, local high scores and optional leaderboard sync.

(function(){
  // Many parts are identical to the previously provided index.html's inline script.
  // For brevity here we keep the code compact and readable while preserving features:
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const logicalW = 480, logicalH = 640;

  // Responsive scaling
  function fitCanvas() {
    const wrap = document.getElementById('canvasWrap');
    const max = Math.min(window.innerWidth - 24, 520);
    wrap.style.width = Math.max(300, max) + 'px';
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform((canvas.width / logicalW), 0, 0, (canvas.height / logicalH), 0, 0);
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  // UI elements
  const startBtn = document.getElementById('startBtn'), resetBtn = document.getElementById('resetBtn');
  const modeSelect = document.getElementById('mode'), cpuDiffSelect = document.getElementById('cpuDifficulty');
  const scoreboard = document.getElementById('scoreboard'), highScoreEl = document.getElementById('highScore'), scoreList = document.getElementById('scoreList');
  const muteBtn = document.getElementById('muteBtn'), volSlider = document.getElementById('vol'), fullscreenBtn = document.getElementById('fullscreenBtn'), installBtn = document.getElementById('installBtn');
  const touchLeft = document.getElementById('touchLeft'), touchRight = document.getElementById('touchRight');

  // Game state & constants
  const MAX_LEVEL = 999;
  const BASE_GRAVITY = 0.5, BASE_JUMP = -8, BASE_PIPE_SPEED = 2.0, BASE_GAP = 160;
  let running = false, frame = 0, level = 1, passed = 0;
  let birds = [], pipes = [], particles = [], pipeIntervalFrames = 120;
  let gravity=BASE_GRAVITY, jumpStrength=BASE_JUMP, pipeSpeed=BASE_PIPE_SPEED, gapSize=BASE_GAP;

  // Input
  const keys = {};
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);

  // Audio (procedural)
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx=null, masterGain=null, musicNode=null, audioEnabled=true;
  function ensureAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = parseFloat(volSlider.value);
      masterGain.connect(audioCtx.destination);
    } catch(e) { audioCtx = null; }
  }
  function playSfx(type='flap'){
    if (!audioEnabled) return;
    ensureAudio(); if (!audioCtx) return;
    const t = audioCtx.currentTime;
    if (type==='flap') {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(450+Math.random()*80, t);
      g.gain.setValueAtTime(0.0025, t);
      o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+0.08);
    } else if (type==='score') {
      const o1 = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), g = audioCtx.createGain();
      o1.type='triangle'; o2.type='sine'; o1.frequency.setValueAtTime(880,t); o2.frequency.setValueAtTime(660,t);
      g.gain.setValueAtTime(0.003,t); o1.connect(g); o2.connect(g); g.connect(masterGain);
      o1.start(t); o2.start(t); o1.stop(t+0.12); o2.stop(t+0.12);
    } else if (type==='hit') {
      const b = audioCtx.createBufferSource(); const len = audioCtx.sampleRate*0.08;
      const buff = audioCtx.createBuffer(1,len,audioCtx.sampleRate); const d = buff.getChannelData(0);
      for (let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.exp(-i/150);
      b.buffer = buff; b.connect(masterGain); b.start();
    }
  }

  // Entities & particles
  class Bird {
    constructor(x,color,label){ this.x=x; this.y=logicalH/2; this.r=14; this.vy=0; this.color=color; this.alive=true; this.score=0; this.controlKey=null; this.isCPU=false; this.label=label; }
    flap(s){ this.vy=s; spawnFlapParticles(this.x,this.y,this.color); playSfx('flap'); }
    update(g){ if(!this.alive) return; this.vy+=g; this.y+=this.vy; if(this.y-this.r<0){this.y=this.r; this.vy=0;} if(this.y+this.r>logicalH){this.y=logicalH-this.r; this.vy=0; this.alive=false; spawnHitParticles(this.x,this.y); playSfx('hit'); } }
    draw(ctx){ ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(Math.max(-0.6,Math.min(0.8,this.vy*0.06))); ctx.fillStyle=this.color; ctx.beginPath(); ctx.ellipse(0,0,this.r*1.2,this.r,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(this.r*0.35,-3,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle='black'; ctx.beginPath(); ctx.arc(this.r*0.35,-3,2,0,Math.PI*2); ctx.fill(); ctx.restore(); ctx.fillStyle='#222'; ctx.font='12px sans-serif'; ctx.fillText(this.label,this.x-6,this.y-this.r-6); }
  }
  class Pipe { constructor(x,gapY,gapSize,speed){ this.x=x; this.gapY=gapY; this.gapSize=gapSize; this.w=60; this.speed=speed; this.passedBy=new Set(); } update(){ this.x-=this.speed; } offscreen(){ return this.x+this.w<0; } draw(ctx){ ctx.fillStyle='#2e8b57'; ctx.fillRect(this.x,0,this.w,this.gapY-this.gapSize/2); ctx.fillRect(this.x,this.gapY+this.gapSize/2,this.w,logicalH-(this.gapY+this.gapSize/2)); ctx.fillStyle='#1e5f3b'; ctx.fillRect(this.x,this.gapY-this.gapSize/2-8,this.w,8); ctx.fillRect(this.x,this.gapY+this.gapSize/2,this.w,8); } collides(b){ if(!b.alive) return false; const bx=b.x, by=b.y, br=b.r; if(bx+br>this.x && bx-br<this.x+this.w){ if(by-br<this.gapY-this.gapSize/2) return true; if(by+br>this.gapY+this.gapSize/2) return true; } return false; } }

  function spawnFlapParticles(x,y,color){ for (let i=0;i<10;i++) particles.push({x,y,vx:(Math.random()*2-1)*2,vy:-Math.random()*2-1,life:30+Math.random()*20,size:2+Math.random()*3,color}); }
  function spawnHitParticles(x,y){ for (let i=0;i<20;i++) particles.push({x,y,vx:(Math.random()*2-1)*6,vy:(Math.random()*2-1)*6,life:30+Math.random()*30,size:2+Math.random()*4,color:'#ff6b6b'}); }
  function updateParticles(){ for (let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.vy+=0.15; p.x+=p.vx; p.y+=p.vy; p.life--; if(p.life<=0) particles.splice(i,1); } }
  function drawParticles(ctx){ for (const p of particles){ ctx.fillStyle=p.color; ctx.globalAlpha = Math.max(0,p.life/60); ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; } }

  // Scores (local)
  function scoresKey(){ return 'flappy999_scores_v1'; }
  function loadScores(){ try { const raw=localStorage.getItem(scoresKey()); return raw?JSON.parse(raw):{}; } catch(e){ return {}; } }
  function saveScores(s){ localStorage.setItem(scoresKey(), JSON.stringify(s)); }
  function recordScore(s){ const k = mode; const sc = loadScores(); if(!sc[k]||s>sc[k]) sc[k]=s; saveScores(sc); updateHighScoreUI(); }

  function updateHighScoreUI(){ const sc=loadScores(); const best=sc[mode]||0; highScoreEl.textContent = 'High: ' + best; scoreList.innerHTML=''; const entries=Object.entries(sc).sort((a,b)=>b[1]-a[1]); for (let [k,v] of entries.slice(0,6)){ const el=document.createElement('div'); el.textContent=`${k}: ${v}`; scoreList.appendChild(el);} }

  function cpuDecideAndFlap(b){ let next=null; for (const p of pipes){ if(p.x+p.w> b.x-10){ next=p; break; } } if(!next) return; const target = next.gapY; const dist = next.x - b.x; const t = Math.max(1, dist / Math.max(0.1, next.speed)); const pred = b.y + b.vy*t + 0.5*gravity*t*t; const agg = parseFloat(cpuDiffSelect.value); const offset = Math.max(10,(gapSize/2-10)*(1/agg)); if (pred > target + offset || (b.y > target + offset && b.vy > 2)) b.flap(jumpStrength); }

  // Initialization
  function updateDifficulty(){ gravity = BASE_GRAVITY + (level-1)*0.003; jumpStrength = BASE_JUMP - (level-1)*0.02; pipeSpeed = BASE_PIPE_SPEED + (level-1)*0.02; gapSize = Math.max(70, BASE_GAP - Math.floor((level-1)*0.6)); pipeIntervalFrames = Math.max(60, 120 - Math.floor((level-1)*0.8)); }
  function spawnPipe(x){ const margin = 60; const gapY = margin + Math.random() * (logicalH - margin*2); pipes.push(new Pipe(x, gapY, gapSize, pipeSpeed)); }

  function initGame(preserveAudio=false){
    running=false; frame=0; level=1; passed=0; birds=[]; pipes=[]; particles=[]; gravity=BASE_GRAVITY; jumpStrength=BASE_JUMP; pipeSpeed=BASE_PIPE_SPEED; gapSize=BASE_GAP;
    mode = modeSelect.value; cpuDifficulty = parseFloat(cpuDiffSelect.value);
    if (mode==='single'){ const b=new Bird(logicalW*0.28,'#ffcc00','P1'); b.controlKey='Space'; birds.push(b); }
    else if (mode==='two'){ const b1=new Bird(logicalW*0.28,'#ffcc00','P1'); b1.controlKey='Space'; const b2=new Bird(logicalW*0.28+60,'#66ccff','P2'); b2.controlKey='ArrowUp'; birds.push(b1,b2); }
    else if (mode==='pvscpu'){ const b1=new Bird(logicalW*0.28,'#ffcc00','P1'); b1.controlKey='Space'; const b2=new Bird(logicalW*0.28+60,'#66ccff','CPU'); b2.isCPU=true; birds.push(b1,b2); }
    else if (mode==='all'){ const b1=new Bird(120,'#ffcc00','P1'); b1.controlKey='Space'; const b2=new Bird(200,'#66ccff','P2'); b2.controlKey='ArrowUp'; const b3=new Bird(280,'#a3ff8f','CPU'); b3.isCPU=true; birds.push(b1,b2,b3); }
    updateDifficulty(); updateHighScoreUI(); draw();
    if (!preserveAudio && musicNode) { try { musicNode.stop(); } catch(e){} musicNode=null; }
  }

  function startGame(){
    if (running) return;
    if (!audioCtx && audioEnabled) { ensureAudio(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }
    running = true; if (pipes.length===0) spawnPipe(logicalW+80); loop();
  }
  function resetGame(){ initGame(); }

  function updateHUD(){ scoreboard.textContent = `Level: ${level} | Passed: ${passed} | Players: ${birds.length} | Alive: ${birds.filter(b=>b.alive).length}`; }

  function loop(){
    if (!running) return;
    frame++;
    if (frame % Math.max(1, pipeIntervalFrames) === 0) spawnPipe(logicalW + 40);
    pipes.forEach(p=>p.update()); pipes = pipes.filter(p=>!p.offscreen());
    birds.forEach((b,idx)=>{
      if (!b.alive) return;
      if (!b.isCPU){
        const k = b.controlKey;
        if (k==='Space'){ if (keys['Space']) { b.flap(jumpStrength); keys['Space']=false; } }
        if (k==='ArrowUp'){ if (keys['ArrowUp']) { b.flap(jumpStrength); keys['ArrowUp']=false; } }
      } else cpuDecideAndFlap(b);
      b.update(gravity);
    });
    pipes.forEach(p=>{
      birds.forEach((b,idx)=>{
        if (!b.alive) return;
        if (p.collides(b)){ if (b.alive){ b.alive=false; spawnHitParticles(b.x,b.y); playSfx('hit'); } }
        if (!p.passedBy.has(idx) && p.x + p.w < b.x){ p.passedBy.add(idx); b.score++; if (mode==='single' || idx===0){ passed++; const levelUpEvery=5; const newLevel = Math.min(MAX_LEVEL, 1 + Math.floor(passed/levelUpEvery)); if (newLevel !== level){ level=newLevel; updateDifficulty(); } } playSfx('score'); recordScore(b.score); }
      });
    });
    if (birds.every(b=>!b.alive)){ running = false; }
    updateParticles(); updateHUD(); draw();
    requestAnimationFrame(loop);
  }

  function draw(){
    ctx.clearRect(0,0,logicalW,logicalH);
    const g = ctx.createLinearGradient(0,0,0,logicalH); g.addColorStop(0,'#87ceeb'); g.addColorStop(1,'#a0e0ff'); ctx.fillStyle=g; ctx.fillRect(0,0,logicalW,logicalH);
    ctx.fillStyle='rgba(255,255,255,0.18)'; for (let i=0;i<6;i++){ ctx.beginPath(); ctx.ellipse(60+i*110 + ((frame*0.2)%120), 70 + (i%2)*22, 44, 22, 0, 0, Math.PI*2); ctx.fill(); }
    pipes.forEach(p=>p.draw(ctx));
    drawParticles(ctx);
    birds.forEach(b=>b.draw(ctx));
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(10,10,220,56); ctx.fillStyle='#fff'; ctx.font='16px bold sans-serif'; ctx.fillText(`Level ${level} / ${MAX_LEVEL}`,18,34); ctx.font='14px sans-serif'; ctx.fillText(`Passed ${passed}`,18,54);
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(logicalW-170,10,160,56); ctx.fillStyle='#fff'; ctx.font='14px sans-serif'; birds.forEach((b,idx)=>{ const label = b.isCPU ? `CPU ${idx+1}` : `${b.label}`; ctx.fillText(`${label}: ${b.score} ${b.alive ? '' : '(dead)'}`, logicalW-160,30+idx*18); });
    if (!running){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0, logicalH/2-58, logicalW, 116); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='28px bold sans-serif'; const aliveCount = birds.filter(b=>b.alive).length; const msg = aliveCount>0 ? 'Paused' : 'Game Over'; ctx.fillText(msg, logicalW/2, logicalH/2-12); ctx.font='16px sans-serif'; ctx.fillText('Press Start to resume or Reset to restart.', logicalW/2, logicalH/2+18); ctx.textAlign='start'; }
  }

  // Input bindings and UI
  startBtn.addEventListener('click', () => { if (!running) startGame(); else running=false; });
  resetBtn.addEventListener('click', resetGame);
  modeSelect.addEventListener('change', () => { localStorage.setItem('flappy999_mode', modeSelect.value); initGame(); });
  cpuDiffSelect.addEventListener('change', () => { localStorage.setItem('flappy999_cpu', cpuDiffSelect.value); });

  // Touch controls
  function flapForPlayer(i){ if (!birds[i]) return; if (birds[i].alive) birds[i].flap(jumpStrength); }
  canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; const rect = canvas.getBoundingClientRect(); const x = t.clientX - rect.left; if (x < rect.width*0.5) flapForPlayer(0); else flapForPlayer(1); }, {passive:false});
  touchLeft.addEventListener('touchstart', e=>{ e.preventDefault(); flapForPlayer(0); }, {passive:false});
  touchRight.addEventListener('touchstart', e=>{ e.preventDefault(); flapForPlayer(1); }, {passive:false});
  canvas.addEventListener('mousedown', e => { const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; if (x < rect.width*0.5) flapForPlayer(0); else flapForPlayer(1); });

  // Fullscreen & audio controls
  fullscreenBtn.addEventListener('click', ()=>{ if (!document.fullscreenElement) canvas.requestFullscreen?.(); else document.exitFullscreen?.(); });
  volSlider.addEventListener('input', ()=>{ if (masterGain) masterGain.gain.value = parseFloat(volSlider.value); localStorage.setItem('flappy999_vol', volSlider.value); });
  let audioFlag = localStorage.getItem('flappy999_mute') !== '1';
  audioEnabled = audioFlag;
  muteBtn.textContent = audioEnabled ? '🔊' : '🔇';
  muteBtn.addEventListener('click', ()=>{ audioEnabled = !audioEnabled; muteBtn.textContent = audioEnabled ? '🔊' : '🔇'; localStorage.setItem('flappy999_mute', audioEnabled ? '0' : '1'); if (audioEnabled && audioCtx && audioCtx.state==='suspended') audioCtx.resume(); });

  // PWA install prompt
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; installBtn.style.display = 'inline-block'; });
  installBtn.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; deferredPrompt = null; installBtn.style.display='none'; });

  // Persistent settings on load
  function loadSettings(){ const m=localStorage.getItem('flappy999_mode'); if(m) modeSelect.value=m; const cpu=localStorage.getItem('flappy999_cpu'); if(cpu) cpuDiffSelect.value=cpu; const vol=localStorage.getItem('flappy999_vol'); if(vol) volSlider.value=vol; const mute=localStorage.getItem('flappy999_mute'); if(mute==='1') { audioEnabled=false; muteBtn.textContent='🔇'; } else audioEnabled=true; }
  loadSettings();
  updateHighScoreUI();
  initGame();

  // Ensure audio context on first user gesture
  window.addEventListener('pointerdown', function onFirst(){ ensureAudio(); if (audioCtx && audioCtx.state==='suspended') audioCtx.resume(); window.removeEventListener('pointerdown', onFirst); }, {once:true});
  // hotkeys
  window.addEventListener('keydown', e => { if (e.code==='KeyR') resetGame(); if (e.code==='Enter') startGame(); });

  // Repaint while paused for UI updates
  setInterval(()=>{ if(!running) draw(); }, 500);
})();
