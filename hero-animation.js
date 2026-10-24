(() => {
  'use strict';
  const source=window.CODI_PARTICLES;
  const canvas=document.getElementById('hero-coordination');
  if (!canvas || !source) return;
  const ctx=canvas.getContext('2d',{alpha:false});
  if (!ctx) return;
  const wrapper=document.getElementById('hero-motion');
  const toggle=document.getElementById('hero-motion-toggle');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const DURATION=30;
  const DRIFT_DURATION=5.8;
  let inView=true;
  const particles = source.particles.map((p, id) => ({
    id, x: p[0], y: p[1], color: p[2], tx: p[3], ty: p[4],
    radius: Math.hypot(p[3], p[4]), angle: Math.atan2(p[4], p[3]),
    // Stable per-particle velocities shear the annulus without resampling its identity.
    speed: 0.38 + 0.91 * ((Math.hypot(p[3],p[4]) - 96) / 111),
    seed: id * 2.399963229728653
  }));
  let elapsed = 0;
  let playing = !reducedMotion.matches;
  let previousTime = null;
  let request = 0;
  let width = 1;
  let height = 1;
  let scale = 1;
  let dpr = 1;
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
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
    ctx.translate(width/2,height/2);ctx.scale(scale,scale);
    const phase=phaseAt(elapsed);
    source.colors.forEach((color,index)=>{
      ctx.beginPath();
      for(const particle of particles){
        if(particle.color!==index)continue;
        const [x,y]=position(particle,phase);
        ctx.moveTo(x+2.65,y);ctx.arc(x,y,2.65,0,2*Math.PI);
      }
      ctx.fillStyle=color;ctx.fill();
    });
  }
  function resize(){
    const bounds=canvas.getBoundingClientRect();
    width=Math.max(1,bounds.width);height=Math.max(1,bounds.height);
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    scale=Math.max(0.01,Math.min((width-16)/700,(height-16)/442));draw();
  }
  function frame(time){
    request=0;
    if(!playing||document.hidden||!inView)return;
    if(previousTime!==null)elapsed=(elapsed+Math.min((time-previousTime)/1000,0.08))%DURATION;
    previousTime=time;draw();request=requestAnimationFrame(frame);
  }
  function schedule(){
    if(request)cancelAnimationFrame(request);
    request=0;previousTime=null;
    toggle.textContent=playing?'Pause animation':'Play animation';
    if(playing&&!document.hidden&&inView)request=requestAnimationFrame(frame);
  }
  toggle.addEventListener('click',()=>{playing=!playing;schedule();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && playing){playing=false;schedule();}
  });
  document.addEventListener('visibilitychange',schedule);
  reducedMotion.addEventListener('change',event=>{
    if(event.matches){playing=false;elapsed=0;draw();schedule();}
  });
  canvas.hidden=false;toggle.hidden=false;wrapper.classList.add('ready');
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:0}).observe(canvas);
  resize();schedule();
})();
