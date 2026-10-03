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
  const MOBILE_MAPS_QUERY='(max-width:700px)';
  const isPhoneMaps=()=>window.matchMedia(MOBILE_MAPS_QUERY).matches&&!document.documentElement.classList.contains('is-ipad');
  const mobileMapsActive=()=>isPhoneMaps()&&state.view==='maps';
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
  function syncMobileMapsSearch(){
    const active=mobileMapsActive(),global=byId('globalSearch'),local=byId('allMapsSearch');
    const localShell=local?.closest('.maps-search-control'),toolbar=byId('allMapsControls')?.querySelector('.maps-toolbar');
    if(local){
      local.hidden=active;
      local.disabled=active;
      local.setAttribute('aria-hidden',String(active));
    }
    if(localShell)localShell.hidden=active;
    if(toolbar)toolbar.hidden=active;
    if(!global)return;
    if(!global.dataset.defaultPlaceholder)global.dataset.defaultPlaceholder=global.getAttribute('placeholder')||'Buscar cursos, mapas, disciplinas ou temas…';
    if(!global.dataset.defaultAriaLabel)global.dataset.defaultAriaLabel=global.getAttribute('aria-label')||'Buscar cursos, mapas, disciplinas ou temas';
    if(active){
      global.dataset.mapsMode='1';
      global.setAttribute('placeholder','Buscar mapas…');
      global.setAttribute('aria-label','Buscar mapas');
      if(document.activeElement!==global&&global.value!==state.allMapsQuery)global.value=state.allMapsQuery||'';
      return;
    }
    if(global.dataset.mapsMode==='1'){
      global.dataset.mapsMode='0';
      global.value='';
      state.globalQuery='';
      if(typeof hideGlobalSearchPanel==='function')hideGlobalSearchPanel();
    }
    global.setAttribute('placeholder',global.dataset.defaultPlaceholder);
    global.setAttribute('aria-label',global.dataset.defaultAriaLabel);
  }
  function renderMobileSortOptions(){
    const section=byId('allMapsFilterPanel')?.querySelector('.maps-filter-sort-section');
    if(!section)return;
    let list=byId('allMapsSortOptions');
    if(!list){
      list=document.createElement('div');
      list.id='allMapsSortOptions';
      list.className='maps-sort-option-list';
      section.appendChild(list);
    }
    list.innerHTML=SORTS.map(([id,label])=>'<button type="button" class="maps-sort-option '+(state.allMapsSort===id?'active':'')+'" data-allmaps-sort-option="'+ESC(id)+'" aria-pressed="'+String(state.allMapsSort===id)+'"><span>'+ESC(label)+'</span><i aria-hidden="true">✓</i></button>').join('');
    list.querySelectorAll('[data-allmaps-sort-option]').forEach(button=>button.onclick=()=>{
      persistAllMapsSort(button.dataset.allmapsSortOption);
      closeAllMapsPanel();
      renderAllMaps();
    });
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
    const q=normalizeSearchText(window.matchMedia('(max-width:700px)').matches?state.globalQuery||state.allMapsQuery||'':state.allMapsQuery||'');
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
    // O painel vai para o body no iPhone para nunca ficar preso a overflow/transform da view.
    if(backdrop)document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    panel.dataset.mode=mode;
    panel.setAttribute('aria-modal',String(isPhoneMaps()));
    if(mode==='sort')renderMobileSortOptions();
    panel.hidden=false;
    if(backdrop)backdrop.hidden=false;
    document.documentElement.classList.add('maps-filter-open');
    byId('allMapsFilterBtn')?.setAttribute('aria-expanded',String(mode==='filter'));
    byId('allMapsMobileFilter')?.setAttribute('aria-expanded',String(mode==='filter'));
    byId('allMapsMobileSort')?.setAttribute('aria-expanded',String(mode==='sort'));
    const title=byId('allMapsFilterPanelTitle');
    if(title)title.textContent=mode==='sort'?'Ordenar mapas':'Filtrar mapas';
    requestAnimationFrame(()=>{
      const target=mode==='sort'?byId('allMapsSortOptions')?.querySelector('.maps-sort-option.active,.maps-sort-option'):byId('allMapsCategory');
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
    syncMobileMapsSearch();
    const controls=byId('allMapsControls');
    if(!isPhoneMaps()&&String(state.globalQuery||'').trim()&&typeof legacyRenderAllMaps==='function'){
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
    byId('globalSearch')?.addEventListener('input',e=>{
      if(!mobileMapsActive())return;
      e.stopImmediatePropagation();
      state.globalQuery=e.target.value;
      state.allMapsQuery=e.target.value;
      if(typeof hideGlobalSearchPanel==='function')hideGlobalSearchPanel();
      renderAllMaps();
    },true);
    window.addEventListener('studyapp:navigation',()=>{
      if(state.view!=='maps')closeAllMapsPanel();
      syncMobileMapsSearch();
    });
    window.addEventListener('resize',syncMobileMapsSearch,{passive:true});
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
    // Delegação em capture: os gatilhos continuam funcionais mesmo após reflow/relocação do sheet no iOS.
    document.addEventListener('click',e=>{
      const sortTrigger=e.target.closest('#allMapsMobileSort');
      if(sortTrigger&&mobileMapsActive()){
        e.preventDefault();
        e.stopPropagation();
        openAllMapsPanel('sort');
        return;
      }
      const filterTrigger=e.target.closest('#allMapsMobileFilter,#allMapsFilterBtn');
      if(filterTrigger&&state.view==='maps'){
        e.preventDefault();
        e.stopPropagation();
        openAllMapsPanel('filter');
      }
    },true);
    byId('allMapsFilterClose')?.addEventListener('click',closeAllMapsPanel);
    byId('allMapsFilterDone')?.addEventListener('click',closeAllMapsPanel);
    byId('allMapsFilterBackdrop')?.addEventListener('click',closeAllMapsPanel);
    byId('allMapsClearFilters')?.addEventListener('click',()=>resetAllMapsFilters({render:true,preserveQuery:true}));
    document.querySelectorAll('[data-allmaps-layout]').forEach(button=>button.addEventListener('click',()=>setAllMapsLayout(button.dataset.allmapsLayout)));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!byId('allMapsFilterPanel')?.hidden)closeAllMapsPanel()});
    document.addEventListener('click',e=>{
      if(state.view!=='maps'||byId('allMapsFilterPanel')?.hidden)return;
      if(isPhoneMaps())return;
      if(!e.target.closest('#allMapsFilterPanel,#allMapsFilterBtn,#allMapsMobileFilter,#allMapsMobileSort'))closeAllMapsPanel();
    });
    document.addEventListener('click',e=>{
      if(!e.target.closest('[data-fav]'))return;
      if(state.view==='maps'&&state.allMapsFavorites)queueMicrotask(()=>renderAllMaps());
    });
    syncMobileMapsSearch();
  }
  bindControls();
})();
