(() => {
  'use strict';
  const source = window.CODI_PARTICLES;
  const canvas = document.getElementById('coordination');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx || !source) {
    document.getElementById('canvas-fallback').hidden = false;
    return;
  }
  const toggle = document.getElementById('toggle');
  const toggleText = document.getElementById('toggle-text');
  const toggleIcon = document.getElementById('toggle-icon');
  const scrub = document.getElementById('scrub');
  const label = document.getElementById('phase-label');
  const status = document.getElementById('status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DURATION = 30;
  const DRIFT_DURATION = 5.8;
  const particles = source.particles.map((p, id) => ({
    id, x: p[0], y: p[1], color: p[2], tx: p[3], ty: p[4],
    radius: Math.hypot(p[3], p[4]), angle: Math.atan2(p[4], p[3]),
    // Stable per-particle velocities shear the annulus without resampling its identity.
    speed: 0.38 + 0.91 * ((Math.hypot(p[3],p[4]) - 96) / 111),
    seed: id * 2.399963229728653
  }));
  let inView = true;
  let elapsed = 0;
  let playing = !reducedMotion.matches;
  let previousTime = null;
  let request = 0;
  let width = 1;
  let height = 1;
  let scale = 1;
  let dpr = 1;
  let lastPhase = '';
  const ease = t => t*t*t*(t*(t*6-15)+10);
  const lerp = (a,b,t) => a+(b-a)*t;

  function phaseAt(t) {
    if (t < 2.8) return {name:'A shared identity',mode:'word',p:0};
    if (t < 5.5) return {name:'Exploring new paths',mode:'transport',p:ease((t-2.8)/2.7)};
    if (t < 6.1) return {name:'Room to move',mode:'ring',p:0};
    if (t < 11.9) return {name:'Different paths. Different rhythms.',mode:'drift',p:t-6.1};
    if (t < 22.9) return {name:'Finding a shared direction',mode:'drift',p:DRIFT_DURATION*(1-ease((t-11.9)/11))};
    if (t < 25.6) return {name:'Coming together',mode:'transport',p:1-ease((t-22.9)/2.7)};
    return {name:'Coordinated. Recognizable. CoDI.',mode:'word',p:0};
  }
  function position(particle, phase) {
    if (phase.mode === 'word') return [particle.x,particle.y];
    if (phase.mode === 'transport') return [lerp(particle.x,particle.tx,phase.p),lerp(particle.y,particle.ty,phase.p)];
    if (phase.mode === 'ring') return [particle.tx,particle.ty];
    // Analytic stored trajectory: evaluate the identical path parameter backwards to undo it.
    const t = phase.p;
    const envelope = Math.sin(Math.min(1,t/1.6)*Math.PI/2);
    const angle = particle.angle + particle.speed*t + 0.18*envelope*Math.sin(t*1.3+particle.seed);
    const radius = particle.radius + 8*envelope*Math.sin(t*1.7+particle.seed*0.61);
    return [radius*Math.cos(angle), radius*Math.sin(angle)];
  }
  function draw() {
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,width,height);
    const phase = phaseAt(elapsed);
    ctx.translate(width/2,height/2-7);
    ctx.scale(scale,scale);
    // One path per color reduces draw calls and retains crisp, fully opaque particles.
    for (let color=0;color<source.colors.length;color++) {
      ctx.beginPath();
      for (const particle of particles) {
        if (particle.color !== color) continue;
        const [x,y] = position(particle,phase);
        const radius = 2.65;
        ctx.moveTo(x+radius,y);
        ctx.arc(x,y,radius,0,Math.PI*2);
      }
      ctx.fillStyle=source.colors[color];
      ctx.fill();
    }
    if (phase.name !== lastPhase) {
      label.textContent=phase.name;
      scrub.setAttribute('aria-valuetext',phase.name);
      lastPhase=phase.name;
    }
    if (document.activeElement !== scrub) scrub.value=String(Math.round(elapsed/DURATION*1000));
  }
  function resize() {
    const bounds=canvas.getBoundingClientRect();
    width=Math.max(1,bounds.width);height=Math.max(1,bounds.height);
    dpr=Math.min(window.devicePixelRatio || 1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    // Same geometry on mobile: fit the full word and the full annulus with breathing room.
    scale=Math.min((width-18)/800,(height-52)/442);
    draw();
  }
  function updateControls() {
    toggleText.textContent=playing?'Pause':'Play';
    toggleIcon.textContent=playing?'Ⅱ':'▶';
    toggle.setAttribute('aria-label',playing?'Pause animation':'Play animation');
  }
  function frame(time) {
    request=0;
    if (!playing || document.hidden || !inView) return;
    if (previousTime !== null) elapsed=(elapsed+Math.min((time-previousTime)/1000,0.08))%DURATION;
    previousTime=time;
    draw();
    request=requestAnimationFrame(frame);
  }
  function setPlaying(value) {
    playing=value;previousTime=null;
    if(request) cancelAnimationFrame(request);
    request=0;updateControls();
    if (playing && !document.hidden && inView) request=requestAnimationFrame(frame);
  }
  toggle.addEventListener('click',()=>setPlaying(!playing));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && playing){setPlaying(false);status.textContent='Animation paused.';}
  });
  document.getElementById('replay').addEventListener('click',()=>{
    elapsed=0;draw();setPlaying(true);status.textContent='Animation restarted.';
  });
  document.getElementById('show-word').addEventListener('click',()=>{
    elapsed=0;setPlaying(false);draw();status.textContent='CoDI displayed. Animation paused.';
  });
  scrub.addEventListener('input',()=>{
    setPlaying(false);elapsed=Number(scrub.value)/1000*(DURATION-0.001);draw();
  });
  document.addEventListener('visibilitychange',()=>{
    previousTime=null;
    if (document.hidden) {if(request)cancelAnimationFrame(request);request=0;}
    else if(playing && inView && !request)request=requestAnimationFrame(frame);
  });
  reducedMotion.addEventListener('change',event=>{
    if(event.matches){elapsed=0;setPlaying(false);draw();}
    updateMotionNote();
  });
  function updateMotionNote(){
    document.getElementById('motion-note').textContent=reducedMotion.matches
      ? 'Motion is paused for your reduced-motion preference. Play whenever you choose.'
      : 'Every particle keeps its color. Every path has a way back.';
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;setPlaying(playing);},{threshold:0}).observe(canvas);
  updateMotionNote();resize();setPlaying(playing);
  // Read-only numerical diagnostics for development, never used to advance the animation.
  window.CODI_STUDY = Object.freeze({
    duration:DURATION, count:particles.length,
    positionAt:(id,time)=>position(particles[id],phaseAt(Math.max(0,Math.min(DURATION,time)))),
    phaseAt:time=>phaseAt(time).name,
    transport:Object.freeze({...source.transport})
  });
})();
