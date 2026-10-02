/* V15.30.0-G · Etapa 3 · organização da biblioteca Todos os Mapas */
(()=>{
  const legacyRenderAllMaps=window.renderAllMaps;
  const SORTS=Object.freeze([
    ['az','A–Z'],
    ['za','Z–A'],
    ['recent','Mais recentes'],
    ['opened','Abertos recentemente'],
    ['progress-desc','Maior progresso'],
    ['progress-asc','Menor progresso'],
    ['topics-desc','Mais tópicos'],
    ['topics-asc','Menos tópicos']
  ]);
  const STATUSES=Object.freeze([
    ['','Todos os status'],
    ['new','Não iniciado'],
    ['progress','Em andamento'],
    ['review','Com revisão'],
    ['difficult','Difícil'],
    ['completed','Concluído']
  ]);
  const byId=id=>document.getElementById(id);
  const safeLabel=value=>String(value||'').trim();
  const mapKeyOf=m=>m?m._key||mapKey(m):'';
  const mapTitle=m=>safeLabel(m?.title||m?.shortTitle||m?.code||'Mapa');
  const courseTitleFor=m=>safeLabel(courseById(m?.courseId)?.title||m?.contest||'Sem curso');
  const sortLabel=value=>SORTS.find(([id])=>id===value)?.[1]||'A–Z';
  const categoryAccent=category=>accent[accentForCategory(category||'Outros')]||accent.gold||'#c3aa84';
  const optionHtml=(value,label,current)=>'<option value="'+ESC(value)+'"'+(value===current?' selected':'')+'>'+ESC(label)+'</option>';

  state.allMapsQuery=state.allMapsQuery||'';
  state.allMapsSort=state.allMapsSort||localStorage.getItem('studyapp.allMapsSort')||'az';
  state.allMapsCategory=state.allMapsCategory||'';
  state.allMapsCourse=state.allMapsCourse||'';
  state.allMapsStatus=state.allMapsStatus||'';
  state.allMapsFavorites=!!state.allMapsFavorites;
  state.allMapsOffline=!!state.allMapsOffline;
  state.allMapsGroup=state.allMapsGroup||'';
  state.allMapsOfflineReady=state.allMapsOfflineReady||{};
  state.allMapsOfflineChecking=false;
  state.allMapsOfflineCheckedAt=0;
  state.allMapsOfflineToken=0;

  function setSelectOptions(el,items,current){
    if(!el)return;
    const html=items.map(([value,label])=>optionHtml(value,label,current)).join('');
    if(el.innerHTML!==html)el.innerHTML=html;
    el.value=current;
  }
  function allMapsFilterCount(){
    return [state.allMapsCategory,state.allMapsCourse,state.allMapsStatus,state.allMapsFavorites,state.allMapsOffline].filter(Boolean).length;
  }
  function allMapsUpdatedTimestamp(m){
    return activityTimestamp(m?.updatedAt||m?.updated_at||m?.createdAt||m?.created_at||m?.releasedAt||'');
  }
  function allMapsActivityTimestamp(m){
    const p=mapProgress(m),key=mapKeyOf(m);
    return activityTimestamp(p?.lastActivity||p?.lastOpened||state.mapActivity?.[key]||'');
  }
  function allMapsSort(items){
    const mode=state.allMapsSort||'az';
    const titleCompare=(a,b)=>mapTitle(a).localeCompare(mapTitle(b),'pt-BR',{sensitivity:'base',numeric:true});
    return [...items].sort((a,b)=>{
      if(mode==='za')return-titleCompare(a,b);
      if(mode==='recent')return allMapsUpdatedTimestamp(b)-allMapsUpdatedTimestamp(a)||titleCompare(a,b);
      if(mode==='opened')return allMapsActivityTimestamp(b)-allMapsActivityTimestamp(a)||titleCompare(a,b);
      if(mode==='progress-desc')return Number(mapProgress(b).pctRaw||0)-Number(mapProgress(a).pctRaw||0)||titleCompare(a,b);
      if(mode==='progress-asc')return Number(mapProgress(a).pctRaw||0)-Number(mapProgress(b).pctRaw||0)||titleCompare(a,b);
      if(mode==='topics-desc')return Number(b?.topics||0)-Number(a?.topics||0)||titleCompare(a,b);
      if(mode==='topics-asc')return Number(a?.topics||0)-Number(b?.topics||0)||titleCompare(a,b);
      return titleCompare(a,b);
    });
  }
  function allMapsMatchesQuery(m,q){
    if(!q)return true;
    return searchMetadataMatch([
      m?.title,m?.shortTitle,m?.code,m?.category,m?.board,m?.contest,
      courseTitleFor(m),courseById(m?.courseId)?.subtitle
    ],q);
  }
  function allMapsFilter(base){
    const q=normalizeSearchText(state.allMapsQuery||'');
    let items=[...base].filter(m=>allMapsMatchesQuery(m,q));
    if(state.allMapsCategory)items=items.filter(m=>safeLabel(m.category||'Outros')===state.allMapsCategory);
    if(state.allMapsCourse)items=items.filter(m=>safeLabel(m.courseId)===state.allMapsCourse);
    if(state.allMapsStatus)items=items.filter(m=>matchesCourseStudyFilter(m,state.allMapsStatus));
    if(state.allMapsFavorites)items=items.filter(m=>favs.has(mapKeyOf(m)));
    if(state.allMapsOffline)items=items.filter(m=>state.allMapsOfflineReady[mapKeyOf(m)]===true);
    return allMapsSort(items);
  }
  function allMapsGroupKey(m){
    if(state.allMapsGroup==='category')return safeLabel(m.category||'Outros')||'Outros';
    if(state.allMapsGroup==='course')return courseTitleFor(m)||'Sem curso';
    return'';
  }
  function renderAllMapsGroups(items){
    const grouped=new Map();
    for(const m of items){
      const key=allMapsGroupKey(m);
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(m);
    }
    return [...grouped.entries()]
      .sort((a,b)=>a[0].localeCompare(b[0],'pt-BR',{sensitivity:'base',numeric:true}))
      .map(([label,maps])=>{
        const sample=maps[0],accentValue=state.allMapsGroup==='category'?mapAccentValue(sample):'#8f96a0';
        return'<section class="maps-group-section" style="--group-accent:'+ESC(accentValue)+'"><div class="maps-group-head"><div><span class="maps-group-dot" aria-hidden="true"></span><h3>'+ESC(label)+'</h3></div><small>'+maps.length+' mapa'+(maps.length===1?'':'s')+'</small></div><div class="map-grid maps-group-grid">'+maps.map(mapCard).join('')+'</div></section>';
      }).join('');
  }
  function renderAllMapsActiveFilters(){
    const root=byId('allMapsActiveFilters');
    if(!root)return;
    const chips=[];
    if(state.allMapsCategory)chips.push({key:'category',label:state.allMapsCategory,accent:categoryAccent(state.allMapsCategory)});
    if(state.allMapsCourse)chips.push({key:'course',label:courseById(state.allMapsCourse)?.title||state.allMapsCourse});
    if(state.allMapsStatus)chips.push({key:'status',label:STATUSES.find(([id])=>id===state.allMapsStatus)?.[1]||state.allMapsStatus});
    if(state.allMapsFavorites)chips.push({key:'favorites',label:'Favoritos',accent:accent.gold});
    if(state.allMapsOffline)chips.push({key:'offline',label:'Disponível offline',accent:accent.green});
    root.hidden=!chips.length;
    root.innerHTML=chips.length?chips.map(chip=>'<button type="button" class="maps-filter-chip" data-allmaps-clear="'+ESC(chip.key)+'"'+(chip.accent?' style="--chip-accent:'+ESC(chip.accent)+'"':'')+'><span>'+ESC(chip.label)+'</span><b aria-hidden="true">×</b></button>').join('')+'<button type="button" class="maps-clear-filters" data-allmaps-clear="all">Limpar filtros</button>':'';
    root.querySelectorAll('[data-allmaps-clear]').forEach(button=>button.onclick=()=>{
      const key=button.dataset.allmapsClear;
      if(key==='all')return resetAllMapsFilters({render:true,preserveQuery:true});
      if(key==='category')state.allMapsCategory='';
      if(key==='course')state.allMapsCourse='';
      if(key==='status')state.allMapsStatus='';
      if(key==='favorites')state.allMapsFavorites=false;
      if(key==='offline')state.allMapsOffline=false;
      renderAllMaps();
    });
  }
  function updateAllMapsControls(base,visible){
    const categories=[...new Set(base.map(m=>safeLabel(m.category||'Outros')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR',{sensitivity:'base'}));
    const courseIds=[...new Set(base.map(m=>safeLabel(m.courseId)).filter(Boolean))];
    const courses=courseIds.map(id=>[id,courseById(id)?.title||id]).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR',{sensitivity:'base'}));
    const query=byId('allMapsSearch');
    if(query&&query.value!==state.allMapsQuery)query.value=state.allMapsQuery;
    setSelectOptions(byId('allMapsSort'),SORTS,state.allMapsSort);
    setSelectOptions(byId('allMapsSortSheet'),SORTS,state.allMapsSort);
    setSelectOptions(byId('allMapsCategory'),[['','Todos os assuntos'],...categories.map(v=>[v,v])],state.allMapsCategory);
    setSelectOptions(byId('allMapsCourse'),[['','Todos os cursos'],...courses],state.allMapsCourse);
    setSelectOptions(byId('allMapsStatus'),STATUSES,state.allMapsStatus);
    setSelectOptions(byId('allMapsGroup'),[['','Sem agrupamento'],['category','Categoria'],['course','Curso']],state.allMapsGroup);
    setSelectOptions(byId('allMapsGroupSheet'),[['','Sem agrupamento'],['category','Categoria'],['course','Curso']],state.allMapsGroup);
    const fav=byId('allMapsFavorites');
    if(fav)fav.checked=state.allMapsFavorites;
    const offline=byId('allMapsOffline');
    if(offline)offline.checked=state.allMapsOffline;
    const count=allMapsFilterCount(),badge=byId('allMapsFilterCount'),mobileBadge=byId('allMapsMobileFilterCount');
    if(badge){badge.textContent=String(count);badge.hidden=!count}
    if(mobileBadge){mobileBadge.textContent=String(count);mobileBadge.hidden=!count}
    const mobileSort=byId('allMapsMobileSortLabel');
    if(mobileSort)mobileSort.textContent=sortLabel(state.allMapsSort);
    const countEl=byId('allMapsCount');
    if(countEl){
      const prefix=state.allMapsOffline&&state.allMapsOfflineChecking?'Verificando offline · ':'';
      countEl.textContent=prefix+(visible.length===base.length&&!state.allMapsQuery&&!count?base.length+' mapa'+(base.length===1?'':'s'):visible.length+' de '+base.length+' mapas');
    }
    document.querySelectorAll('[data-allmaps-layout]').forEach(btn=>{
      const active=btn.dataset.allmapsLayout===(state.mapLayout==='list'?'list':'grid');
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',String(active));
    });
    renderAllMapsActiveFilters();
  }
  async function refreshAllMapsOfflineAvailability(base=combinedMaps(),options={}){
    const now=Date.now();
    if(state.allMapsOfflineChecking)return;
    if(!options.force&&state.allMapsOfflineCheckedAt&&now-state.allMapsOfflineCheckedAt<3000)return;
    const token=++state.allMapsOfflineToken;
    state.allMapsOfflineChecking=true;
    if(state.allMapsOffline&&state.view==='maps')updateAllMapsControls(base,allMapsFilter(base));
    try{
      const pairs=await Promise.all(base.map(async m=>[mapKeyOf(m),await mapAvailableOffline(m)]));
      if(token!==state.allMapsOfflineToken)return;
      state.allMapsOfflineReady=Object.fromEntries(pairs);
      state.allMapsOfflineCheckedAt=Date.now();
    }finally{
      if(token===state.allMapsOfflineToken)state.allMapsOfflineChecking=false;
    }
    if(token===state.allMapsOfflineToken&&state.view==='maps'&&!state.globalQuery&&state.allMapsOffline)renderAllMaps({skipOfflineRefresh:true});
  }
  function persistAllMapsSort(value){
    if(!SORTS.some(([id])=>id===value))value='az';
    state.allMapsSort=value;
    localStorage.setItem('studyapp.allMapsSort',value);
    if(typeof touchPreferences==='function')touchPreferences();
  }
  function setAllMapsLayout(layout){
    state.mapLayout=layout==='list'?'list':'grid';
    localStorage.setItem('studyapp.mapLayout',state.mapLayout);
    if(typeof touchPreferences==='function')touchPreferences();
    renderAllMaps();
  }
  function closeAllMapsPanel(){
    const panel=byId('allMapsFilterPanel'),backdrop=byId('allMapsFilterBackdrop');
    if(panel)panel.hidden=true;
    if(backdrop)backdrop.hidden=true;
    document.documentElement.classList.remove('maps-filter-open');
    byId('allMapsFilterBtn')?.setAttribute('aria-expanded','false');
    byId('allMapsMobileFilter')?.setAttribute('aria-expanded','false');
    byId('allMapsMobileSort')?.setAttribute('aria-expanded','false');
  }
  function openAllMapsPanel(mode='filter'){
    const panel=byId('allMapsFilterPanel'),backdrop=byId('allMapsFilterBackdrop');
    if(!panel)return;
    panel.dataset.mode=mode;
    panel.setAttribute('aria-modal',String(window.matchMedia('(max-width:700px)').matches));
    panel.hidden=false;
    if(backdrop)backdrop.hidden=false;
    document.documentElement.classList.add('maps-filter-open');
    byId('allMapsFilterBtn')?.setAttribute('aria-expanded',String(mode==='filter'));
    byId('allMapsMobileFilter')?.setAttribute('aria-expanded',String(mode==='filter'));
    byId('allMapsMobileSort')?.setAttribute('aria-expanded',String(mode==='sort'));
    const title=byId('allMapsFilterPanelTitle');
    if(title)title.textContent=mode==='sort'?'Ordenar mapas':'Filtrar mapas';
    requestAnimationFrame(()=>{
      const target=mode==='sort'?byId('allMapsSortSheet'):byId('allMapsCategory');
      target?.focus?.({preventScroll:true});
    });
  }
  function resetAllMapsFilters(options={}){
    state.allMapsQuery=options.preserveQuery?state.allMapsQuery:'';
    state.allMapsCategory='';
    state.allMapsCourse='';
    state.allMapsStatus='';
    state.allMapsFavorites=false;
    state.allMapsOffline=false;
    state.allMapsGroup='';
    const input=byId('allMapsSearch');
    if(input&&!options.preserveQuery)input.value='';
    closeAllMapsPanel();
    if(options.render!==false&&state.view==='maps')renderAllMaps();
  }
  window.resetAllMapsFilters=resetAllMapsFilters;
  window.closeAllMapsPanel=closeAllMapsPanel;

  window.renderAllMaps=function renderAllMaps(options={}){
    const controls=byId('allMapsControls');
    if(String(state.globalQuery||'').trim()&&typeof legacyRenderAllMaps==='function'){
      if(controls)controls.hidden=true;
      return legacyRenderAllMaps();
    }
    if(controls)controls.hidden=false;
    const root=byId('allMaps'),wrap=byId('allMapsWrap'),base=combinedMaps(),visible=allMapsFilter(base);
    if(wrap)wrap.classList.toggle('map-list',state.mapLayout==='list');
    if(!base.length){
      root.className='map-grid';
      root.innerHTML=emptyStateHtml({
        title:'Nenhum mapa disponível',
        text:StudyCloud.session()?'Adicione mapas aos seus concursos para vê-los nesta biblioteca.':'Entre na sua conta para carregar seus mapas.',
        mascot:'maps',className:'all-maps-empty-state'
      });
    }else if(!visible.length){
      root.className='maps-library-results';
      const text=state.allMapsOffline&&state.allMapsOfflineChecking?'Verificando quais mapas estão disponíveis offline neste aparelho.':'Ajuste a busca ou remova algum filtro para exibir mapas.';
      root.innerHTML=emptyStateHtml({title:'Nenhum mapa neste filtro',text,mascot:'maps',compact:true,className:'all-maps-filter-empty'});
    }else if(state.allMapsGroup){
      root.className='maps-library-results maps-library-grouped';
      root.innerHTML=renderAllMapsGroups(visible);
    }else{
      root.className='map-grid';
      root.innerHTML=visible.map(mapCard).join('');
    }
    bindMapCards(root);
    updateAllMapsControls(base,visible);
    if(!options.skipOfflineRefresh)void refreshAllMapsOfflineAvailability(base);
  };

  function bindControls(){
    const search=byId('allMapsSearch');
    if(search)search.oninput=e=>{state.allMapsQuery=e.target.value;renderAllMaps()};
    const sort=byId('allMapsSort'),sortSheet=byId('allMapsSortSheet');
    const sortChange=e=>{persistAllMapsSort(e.target.value);closeAllMapsPanel();renderAllMaps()};
    if(sort)sort.onchange=sortChange;
    if(sortSheet)sortSheet.onchange=sortChange;
    const category=byId('allMapsCategory');
    if(category)category.onchange=e=>{state.allMapsCategory=e.target.value;renderAllMaps()};
    const course=byId('allMapsCourse');
    if(course)course.onchange=e=>{state.allMapsCourse=e.target.value;renderAllMaps()};
    const status=byId('allMapsStatus');
    if(status)status.onchange=e=>{state.allMapsStatus=e.target.value;renderAllMaps()};
    const fav=byId('allMapsFavorites');
    if(fav)fav.onchange=e=>{state.allMapsFavorites=!!e.target.checked;renderAllMaps()};
    const offline=byId('allMapsOffline');
    if(offline)offline.onchange=e=>{
      state.allMapsOffline=!!e.target.checked;
      if(state.allMapsOffline)void refreshAllMapsOfflineAvailability(combinedMaps(),{force:true});
      renderAllMaps();
    };
    const group=byId('allMapsGroup'),groupSheet=byId('allMapsGroupSheet');
    const groupChange=e=>{state.allMapsGroup=e.target.value;renderAllMaps()};
    if(group)group.onchange=groupChange;
    if(groupSheet)groupSheet.onchange=groupChange;
    byId('allMapsFilterBtn')?.addEventListener('click',()=>openAllMapsPanel('filter'));
    byId('allMapsMobileFilter')?.addEventListener('click',()=>openAllMapsPanel('filter'));
    byId('allMapsMobileSort')?.addEventListener('click',()=>openAllMapsPanel('sort'));
    byId('allMapsFilterClose')?.addEventListener('click',closeAllMapsPanel);
    byId('allMapsFilterDone')?.addEventListener('click',closeAllMapsPanel);
    byId('allMapsFilterBackdrop')?.addEventListener('click',closeAllMapsPanel);
    byId('allMapsClearFilters')?.addEventListener('click',()=>resetAllMapsFilters({render:true,preserveQuery:true}));
    document.querySelectorAll('[data-allmaps-layout]').forEach(button=>button.addEventListener('click',()=>setAllMapsLayout(button.dataset.allmapsLayout)));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!byId('allMapsFilterPanel')?.hidden)closeAllMapsPanel()});
    document.addEventListener('click',e=>{
      if(state.view!=='maps'||byId('allMapsFilterPanel')?.hidden)return;
      if(window.matchMedia('(max-width:700px)').matches)return;
      if(!e.target.closest('#allMapsFilterPanel,#allMapsFilterBtn'))closeAllMapsPanel();
    });
    document.addEventListener('click',e=>{
      if(!e.target.closest('[data-fav]'))return;
      if(state.view==='maps'&&state.allMapsFavorites)queueMicrotask(()=>renderAllMaps());
    });
  }
  bindControls();
})();
