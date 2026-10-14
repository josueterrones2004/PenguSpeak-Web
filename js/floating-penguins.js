(() => {
  const sections=[...document.querySelectorAll('.intro-story,.rest,.final-cta')];
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let scheduled=false;
  const update=()=>{
    scheduled=false;
    for(const section of sections){
      const r=section.getBoundingClientRect();
      if(r.bottom<0||r.top>innerHeight)continue;
      const amount=Math.max(-1,Math.min(1,(innerHeight*.5-(r.top+r.height*.5))/innerHeight));
      section.querySelectorAll('.penguin-drift span').forEach((el,i)=>{
        el.style.setProperty('--drift',`${Math.round(amount*(24+i*13)*(i%2?-1:1))}px`);
      });
    }
  };
  addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}},{passive:true});
  addEventListener('resize',update,{passive:true});update();
})();
