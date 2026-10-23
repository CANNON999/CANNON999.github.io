/* Original real-time particle study, informed by Sony's PS5 boot/login sequence.
   Glow sprites are cached once; motion is driven by elapsed time, never frame count. */
export function createPortfolioDust(canvas, seedValue) {
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return {resize(){},draw(){}};
  let seed = seedValue, w = 0, h = 0;
  const random = () => {seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646;};
  const palette = ['255,226,169','226,235,249','212,193,153'];
  function sprite(color, blurred) {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d');
    const gradient = g.createRadialGradient(48,48,0,48,48,48);
    if (blurred) {
      gradient.addColorStop(0,`rgba(${color},.32)`);
      gradient.addColorStop(.25,`rgba(${color},.27)`);
      gradient.addColorStop(.55,`rgba(${color},.11)`);
      gradient.addColorStop(1,`rgba(${color},0)`);
    } else {
      gradient.addColorStop(0,`rgba(${color},1)`);
      gradient.addColorStop(.23,`rgba(${color},.9)`);
      gradient.addColorStop(.48,`rgba(${color},.22)`);
      gradient.addColorStop(1,`rgba(${color},0)`);
    }
    g.fillStyle=gradient;g.fillRect(0,0,96,96);return c;
  }
  const sharp = palette.map(c=>sprite(c,false)), soft = palette.map(c=>sprite(c,true));
  const haze = sprite('199,187,163',true);
  const dots = Array.from({length:720},(_,i)=>{
    const layer = i < 26 ? 2 : i < 180 ? 1 : 0;
    return {x:random(),y:random(),phase:random()*Math.PI*2,depth:random(),
      speed:.45+random()*.8,alpha:.4+random()*.6,color:random()<.76?0:1,
      size:layer===2?16+random()*37:layer===1?3+random()*6:1.2+random()*2.9,layer};
  });
  function resize() {
    const box=canvas.getBoundingClientRect();w=box.width;h=box.height;
    const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function draw(time, ambient=false, still=false) {
    if (!w || !h) return;
    const t=still?0:time/1000;
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation='lighter';
    // Very broad, barely visible volumes: the light has a source above/right.
    ctx.globalAlpha=ambient?.055:.16;
    ctx.drawImage(haze,w*.3+Math.sin(t*.045)*w*.025,-h*.38,w*1.1,h*1.5);
    ctx.globalAlpha=ambient?.025:.07;
    ctx.drawImage(haze,-w*.3,h*.18,w*1.25,h*.85);
    const mobile=w<600, count=ambient?(mobile?160:280):(mobile?380:720);
    for (let i=0;i<count;i++) {
      const p=dots[i];
      const drift=(.5+p.layer*.8)*p.speed;
      const x=((p.x*(w+120)+t*drift*3.2)%(w+120))-60;
      const y=((p.y*(h+100)-t*drift*1.7+Math.sin(t*.13+p.phase)*(5+p.layer*6))%(h+100)+(h+100))%(h+100)-50;
      const beam=.32+.68*Math.exp(-Math.pow((x/w-.66)/.48,2));
      const breath=.78+.22*Math.sin(t*.42+p.phase);
      const depthAlpha=p.layer===2?.85:p.layer===1?.85:.9;
      ctx.globalAlpha=p.alpha*beam*breath*depthAlpha*(ambient?.43:1);
      const size=p.size*(mobile?.75:1)*(1+Math.sin(t*.09+p.phase)*.07);
      ctx.drawImage(p.layer===2?soft[p.color]:sharp[p.color],x-size/2,y-size/2,size,size);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  resize();return {resize,draw};
};
