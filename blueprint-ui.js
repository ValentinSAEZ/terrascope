// Presentation only: the percentage rows remain driven by the existing data renderer.
document.addEventListener('DOMContentLoaded',()=>{
  const fuel=document.querySelector('#fuel');
  if(!fuel)return;
  const decorate=()=>fuel.querySelectorAll(':scope > div').forEach(row=>{
    const value=Number(row.querySelector('b')?.textContent.replace(/[%\s\u202f\u00a0]/g,'').replace(',','.'));
    if(!Number.isFinite(value)||value<0||value>100)return;
    row.style.setProperty('--fuel-share',value+'%');
    const color=row.querySelector('i')?.style.background;
    if(color)row.style.setProperty('--fuel-color',color);
  });
  new MutationObserver(decorate).observe(fuel,{childList:true,subtree:true});decorate();
});
