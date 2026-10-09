'use strict';
(function(){
  const STORAGE_KEY='studyapp.appIconMode';
  const VALID=new Set(['auto','light','dark']);
  const media=window.matchMedia('(prefers-color-scheme: light)');
  const assets={
    light:{
      preview:'assets/brand/topographic-editorial-v1/icons/pwa-icon-light-192.png',
      favicon:'assets/brand/topographic-editorial-v1/icons/pwa-icon-light-192.png',
      touch:'assets/brand/topographic-editorial-v1/icons/apple-touch-icon-light.png',
      touchSize:'180x180',
      manifest:'manifest-light-v15.36.2.webmanifest?v=15.48.17'
    },
    dark:{
      preview:'assets/brand/topographic-editorial-v1/icons/pwa-icon-192.png',
      favicon:'assets/brand/topographic-editorial-v1/icons/pwa-icon-192.png',
      touch:'assets/brand/topographic-editorial-v1/icons/apple-touch-icon.png',
      touchSize:'180x180',
      manifest:'manifest-v15.23.6.webmanifest?v=15.48.17'
    }
  };
  function readMode(){
    try{
      const value=localStorage.getItem(STORAGE_KEY)||'auto';
      return VALID.has(value)?value:'auto';
    }catch(_){return'auto'}
  }
  function resolvedMode(mode=readMode()){
    return mode==='auto'?(media.matches?'light':'dark'):mode;
  }
  function setHref(id,href,size){
    const link=document.getElementById(id);
    if(!link)return;
    link.href=href;
    if(size)link.setAttribute('sizes',size);
  }
  function render(mode=readMode()){
    const resolved=resolvedMode(mode),asset=assets[resolved];
    document.documentElement.dataset.appIconPreference=mode;
    document.documentElement.dataset.appIconResolved=resolved;

    const explicit=document.getElementById('appIconExplicitFavicon');
    if(explicit){
      explicit.media=mode==='auto'?'not all':'all';
      explicit.href=asset.favicon+'?v=15.48.17-'+resolved;
    }
    setHref('appAppleTouchIcon',asset.touch+'?v=15.48.17-'+resolved,asset.touchSize);
    setHref('appAppleTouchIconPrecomposed',asset.touch+'?v=15.48.17-'+resolved,asset.touchSize);
    const manifest=document.getElementById('appManifest');
    if(manifest&&manifest.getAttribute('href')!==asset.manifest)manifest.setAttribute('href',asset.manifest);

    document.querySelectorAll('[data-app-icon-mode]').forEach(button=>{
      const selected=button.dataset.appIconMode===mode;
      button.classList.toggle('is-selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });

    const preview=document.getElementById('appIconPreview');
    if(preview)preview.src=asset.preview;
    const current=document.getElementById('appIconCurrent');
    if(current)current.textContent=mode==='auto'?'Automático · '+(resolved==='light'?'Claro':'Escuro'):(mode==='light'?'Claro':'Escuro');
    const title=document.getElementById('appIconPreviewTitle');
    if(title)title.textContent=mode==='auto'?'Automático':mode==='light'?'Claro':'Escuro';
    const description=document.getElementById('appIconPreviewText');
    if(description)description.textContent=mode==='auto'?'Segue a aparência do sistema · '+(resolved==='light'?'claro ativo agora':'escuro ativo agora'):(mode==='light'?'Ícone claro selecionado neste dispositivo.':'Ícone escuro selecionado neste dispositivo.');
  }
  function choose(mode){
    if(!VALID.has(mode))return;
    try{localStorage.setItem(STORAGE_KEY,mode)}catch(_){}
    render(mode);
    if(typeof toast==='function')toast(mode==='auto'?'Ícone automático ativado.':mode==='light'?'Ícone claro selecionado.':'Ícone escuro selecionado.');
  }
  function init(){
    render();
    document.querySelectorAll('[data-app-icon-mode]').forEach(button=>{
      button.addEventListener('click',()=>choose(button.dataset.appIconMode));
    });
    const onSystemChange=()=>{if(readMode()==='auto')render('auto')};
    if(media.addEventListener)media.addEventListener('change',onSystemChange);
    else if(media.addListener)media.addListener(onSystemChange);
    window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)render()});
  }
  window.AppIconSettings={readMode,resolvedMode,render,choose};
  init();
})();
