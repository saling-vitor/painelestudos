'use strict';
const PROGRESS_FILTERS=[['all','Todos'],['progress','Em andamento'],['review','Revisão'],['difficult','Difíceis'],['completed','Concluídos']];
const PROGRESS_SORTS=[['priority','Prioridade'],['recent','Mais recente'],['progress-asc','Menor progresso'],['progress-desc','Maior progresso'],['alpha','A–Z']];
function progressStoredSet(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return new Set(Array.isArray(value)?value:[])}catch{return new Set()}}
const progressExpandedCourses=progressStoredSet('studyapp.progressExpandedCourses');
const progressShowAllCourses=progressStoredSet('studyapp.progressShowAllCourses');
let progressSort=(()=>{try{return localStorage.getItem('studyapp.progressSort')||'priority'}catch{return'priority'}})();
if(!PROGRESS_SORTS.some(([id])=>id===progressSort))progressSort='priority';
function saveProgressSet(key,set){try{localStorage.setItem(key,JSON.stringify([...set]))}catch{}}
function matchesProgressFilter(map){const p=mapProgress(map);switch(state.progressFilter){case'progress':return p.marked>0&&p.marked<p.total;case'review':return p.review>0;case'difficult':return p.difficult>0;case'completed':return p.total>0&&p.marked>=p.total;default:return true}}
function attentionMaps(maps){return maps.map(m=>({map:m,progress:mapProgress(m)})).filter(item=>item.progress.review>0||item.progress.difficult>0).sort((a,b)=>{if(b.progress.difficult!==a.progress.difficult)return b.progress.difficult-a.progress.difficult;if(b.progress.review!==a.progress.review)return b.progress.review-a.progress.review;return activityTimestamp(b.progress.lastActivity)-activityTimestamp(a.progress.lastActivity)})}
function progressPercentValue(p){return Math.max(0,Math.min(100,Number(p?.pctRaw??p?.pct)||0))}
function progressPriorityRank(p){if(p.difficult>0||p.review>0)return 0;if(p.marked>0&&p.marked<p.total)return 1;if(activityTimestamp(p.lastActivity)>0&&p.marked<p.total)return 2;if(p.marked===0)return 3;if(p.total>0&&p.marked>=p.total)return 4;return 5}
function sortProgressMaps(maps){const rows=(maps||[]).map(map=>({map,progress:mapProgress(map)}));rows.sort((a,b)=>{const ap=a.progress,bp=b.progress;if(progressSort==='recent')return activityTimestamp(bp.lastActivity)-activityTimestamp(ap.lastActivity)||String(a.map.title||'').localeCompare(String(b.map.title||''),'pt-BR');if(progressSort==='progress-asc')return progressPercentValue(ap)-progressPercentValue(bp)||String(a.map.title||'').localeCompare(String(b.map.title||''),'pt-BR');if(progressSort==='progress-desc')return progressPercentValue(bp)-progressPercentValue(ap)||String(a.map.title||'').localeCompare(String(b.map.title||''),'pt-BR');if(progressSort==='alpha')return String(a.map.title||a.map.shortTitle||'').localeCompare(String(b.map.title||b.map.shortTitle||''),'pt-BR');const rank=progressPriorityRank(ap)-progressPriorityRank(bp);if(rank)return rank;if(bp.difficult!==ap.difficult)return bp.difficult-ap.difficult;if(bp.review!==ap.review)return bp.review-ap.review;return activityTimestamp(bp.lastActivity)-activityTimestamp(ap.lastActivity)});return rows}
function progressStateBadges(p,includePending=true){const items=[];if(p.done>0)items.push('<span class="progress-state ok">OK '+p.done+'</span>');if(p.review>0)items.push('<span class="progress-state review">REV '+p.review+'</span>');if(p.difficult>0)items.push('<span class="progress-state difficult">DIF '+p.difficult+'</span>');if(includePending&&p.pending>0)items.push('<span class="progress-state pending">PEND '+p.pending+'</span>');return items.join('')}
function progressMapMeta(p){if(p.total<=0)return'Sem tópicos catalogados';if(p.marked===0){const opened=activityTimestamp(p.lastActivity)>0?'Aberto '+activityLabel(p.lastActivity,''):'Não iniciado';return opened+' · '+p.total+' tópico'+(p.total===1?'':'s')}if(p.marked>=p.total)return'Concluído · '+p.total+' tópico'+(p.total===1?'':'s');return formatProgressPercent(p)+' · '+p.marked+'/'+p.total+' estudados'}
function renderProgressMetrics(p){
  const inProgress=combinedMaps().filter(map=>{const mp=mapProgress(map);return mp.marked>0&&mp.marked<mp.total}).length;
  $('#progressMetrics').innerHTML=[
    [formatProgressPercent(p),'Progresso geral'],
    [String(p.marked),'Tópicos estudados'],
    [String(p.review),'Revisões'],
    [ESC(formatStudyDuration(studyTimeWeekSeconds())),'Tempo esta semana']
  ].map(([value,label])=>'<div class="metric"><b>'+value+'</b><span>'+label+'</span></div>').join('');
  const root=$('#progressMetrics');if(root)root.dataset.activeMaps=String(inProgress)
}
function renderProgressMapRow(item){
  const m=item.map,p=item.progress,key=m._key||mapKey(m),started=p.marked>0,states=started?progressStateBadges(p,false):'';
  return'<div class="progress-map-row '+(started?'progress-map-active':'progress-map-unstarted')+'" data-progress-map="'+ESC(key)+'" data-progress-row-open="'+ESC(key)+'" role="button" tabindex="0" aria-label="'+ESC('Abrir '+(m.title||m.shortTitle||m.code||'mapa'))+'" style="'+ESC(mapAccentVars(m))+'"><div class="progress-map-main"><span class="map-code compact-code">'+ESC(m.code||'MAP')+'</span><div class="progress-map-copy"><b>'+ESC(m.title||m.shortTitle)+'</b><span class="progress-map-meta">'+ESC(progressMapMeta(p))+'</span>'+(states?'<div class="progress-map-mobile-states progress-states">'+states+'</div>':'')+'</div></div><div class="progress-map-trailing"><b>'+formatProgressPercent(p)+'</b><span aria-hidden="true">›</span></div></div>'
}
function renderProgressCourse(c,allMaps){
  const maps=allMaps.filter(m=>m.courseId===c.id),cp=aggregateProgress(maps),visible=sortProgressMaps(maps.filter(matchesProgressFilter));
  if(state.progressFilter!=='all'&&!visible.length)return'';
  const expanded=progressExpandedCourses.has(c.id),showAll=progressShowAllCourses.has(c.id);
  const isPhone=document.documentElement.classList.contains('is-phone-layout')||window.matchMedia('(max-width:700px)').matches;
  const limit=isPhone?3:6,shown=showAll?visible:visible.slice(0,limit);
  const summary=[cp.total+' tópico'+(cp.total===1?'':'s'),maps.length+' mapa'+(maps.length===1?'':'s')];
  if(cp.pending>0)summary.push('PEND '+cp.pending);
  let body='';
  if(expanded){
    body='<div class="progress-map-list">'+(shown.length?shown.map(renderProgressMapRow).join(''):emptyStateHtml({title:'Nada neste filtro',text:'Nenhum mapa corresponde ao filtro selecionado.',mascot:'progress',compact:true,className:'progress-filter-empty'}))+'</div>'+(visible.length>limit?'<div class="progress-course-more"><button type="button" class="secondary" data-progress-show-all="'+ESC(c.id)+'">'+(showAll?'Mostrar menos':'Mostrar todos os '+visible.length)+'</button></div>':'')
  }
  const toggleLabel=expanded?'Recolher':'Expandir';
  return'<section class="progress-course progress-course-compact '+(expanded?'is-expanded':'is-collapsed')+'" data-progress-course-section="'+ESC(c.id)+'"><button type="button" class="progress-course-head progress-course-head-button" data-progress-course-toggle="'+ESC(c.id)+'" aria-expanded="'+String(expanded)+'" aria-label="'+ESC(toggleLabel+' '+c.title)+'"><div class="progress-course-title"><span class="kicker">Concurso</span><h3>'+ESC(c.title)+'</h3><p>'+ESC(summary.join(' · '))+'</p></div><div class="progress-course-score"><b>'+formatProgressPercent(cp)+'</b><span>'+cp.marked+' / '+cp.total+'</span></div><span class="progress-course-chevron" aria-hidden="true">'+(expanded?'⌃':'⌄')+'</span></button><div class="progress-course-summary">'+progressBarHtml(cp,'course-summary-bar')+'</div>'+body+'</section>'
}
function renderProgress(){
  document.querySelectorAll('body>#progressSortBackdrop,body>#progressSortSheet').forEach(el=>el.remove());
  const all=combinedMaps(),p=aggregateProgress(all),courses=combinedCourses();
  renderProgressMetrics(p);
  const attention=$('#progressAttention');
  if(attention){attention.hidden=true;attention.innerHTML=''}
  const blocks=courses.map(c=>renderProgressCourse(c,all)).join('');
  const intro=p.marked?'Qualquer estado OK, REV ou DIF conta como tópico estudado.':'Comece por um mapa para gerar seu progresso; revisões e prioridades aparecerão automaticamente.';
  const sortLabel=(PROGRESS_SORTS.find(([id])=>id===progressSort)||PROGRESS_SORTS[0])[1];
  const sortSheet='<div class="progress-sort-backdrop" id="progressSortBackdrop" hidden></div><section class="progress-sort-sheet" id="progressSortSheet" role="dialog" aria-modal="true" aria-labelledby="progressSortSheetTitle" hidden><div class="progress-sort-sheet-head"><div><span class="kicker">Ordenação</span><h3 id="progressSortSheetTitle">Ordenar mapas</h3></div><button type="button" class="progress-sort-sheet-close" id="progressSortClose" aria-label="Fechar">×</button></div><div class="progress-sort-sheet-options">'+PROGRESS_SORTS.map(([id,label])=>'<button type="button" class="progress-sort-option '+(progressSort===id?'active':'')+'" data-progress-sort-option="'+id+'" aria-pressed="'+String(progressSort===id)+'"><span>'+ESC(label)+'</span><i aria-hidden="true">✓</i></button>').join('')+'</div></section>';
  $('#progressInfo').innerHTML='<section class="progress-global-panel" id="progressGlobalPanel"><div class="progress-global-head"><div><span class="kicker">Visão geral</span><h3>Progresso geral</h3><p>'+ESC(intro)+'</p></div><div class="progress-global-score"><b>'+formatProgressPercent(p)+'</b><span>'+p.marked+' / '+p.total+' tópicos</span></div></div>'+progressBarHtml(p,'progress-global-bar')+'<div class="progress-global-footer"><div class="progress-states">'+progressStateBadges(p,true)+'</div><div class="progress-controls"><div class="progress-filter-row" id="progressFilters">'+PROGRESS_FILTERS.map(([id,label])=>'<button type="button" class="progress-filter '+(state.progressFilter===id?'active':'')+'" data-progress-filter="'+id+'">'+ESC(label)+'</button>').join('')+'</div><div class="progress-sort-wrap"><label class="progress-sort-control"><span>Ordenar</span><select id="progressSort">'+PROGRESS_SORTS.map(([id,label])=>'<option value="'+id+'"'+(progressSort===id?' selected':'')+'>'+ESC(label)+'</option>').join('')+'</select></label><button type="button" class="secondary progress-sort-mobile-trigger" id="progressSortMobile" aria-expanded="false" aria-controls="progressSortSheet"><span aria-hidden="true">↕</span><span id="progressSortMobileLabel">'+ESC(sortLabel)+'</span></button></div></div></div></section>'+sortSheet+'<div class="progress-course-stack">'+(blocks||emptyStateHtml({title:'Nenhum progresso para mostrar',text:'Quando houver mapas compatíveis com este filtro, eles aparecerão aqui.',mascot:'progress',className:'progress-empty-guidance'}))+'</div>';
  const sortBackdrop=$('#progressSortBackdrop'),sortSheetEl=$('#progressSortSheet');
  if(sortBackdrop&&sortSheetEl)document.body.append(sortBackdrop,sortSheetEl);

  const closeSortSheet=()=>{
    if(sortBackdrop)sortBackdrop.hidden=true;
    if(sortSheetEl)sortSheetEl.hidden=true;
    const trigger=$('#progressSortMobile');
    if(trigger)trigger.setAttribute('aria-expanded','false');
    document.documentElement.classList.remove('progress-sort-open');
  };
  const openSortSheet=()=>{
    if(!sortBackdrop||!sortSheetEl)return;
    sortBackdrop.hidden=false;
    sortSheetEl.hidden=false;
    const trigger=$('#progressSortMobile');
    if(trigger)trigger.setAttribute('aria-expanded','true');
    document.documentElement.classList.add('progress-sort-open');
  };
  const filters=$('#progressFilters');
  filters?.querySelectorAll('[data-progress-filter]').forEach(button=>button.onclick=()=>{state.progressFilter=button.dataset.progressFilter;renderProgress()});
  const sort=$('#progressSort');
  if(sort)sort.onchange=()=>{progressSort=sort.value;try{localStorage.setItem('studyapp.progressSort',progressSort)}catch{}renderProgress()};
  $('#progressSortMobile')?.addEventListener('click',openSortSheet);
  $('#progressSortBackdrop')?.addEventListener('click',closeSortSheet);
  $('#progressSortClose')?.addEventListener('click',closeSortSheet);
  $$('#progressSortSheet [data-progress-sort-option]').forEach(button=>button.onclick=()=>{
    progressSort=button.dataset.progressSortOption;
    try{localStorage.setItem('studyapp.progressSort',progressSort)}catch{}
    closeSortSheet();
    renderProgress();
  });
  $$('#progressInfo [data-progress-course-toggle]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.progressCourseToggle;
    if(progressExpandedCourses.has(id)){progressExpandedCourses.delete(id);progressShowAllCourses.delete(id)}
    else progressExpandedCourses.add(id);
    saveProgressSet('studyapp.progressExpandedCourses',progressExpandedCourses);
    saveProgressSet('studyapp.progressShowAllCourses',progressShowAllCourses);
    renderProgress()
  });
  $$('#progressInfo [data-progress-show-all]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.progressShowAll;
    if(progressShowAllCourses.has(id))progressShowAllCourses.delete(id);
    else progressShowAllCourses.add(id);
    saveProgressSet('studyapp.progressShowAllCourses',progressShowAllCourses);
    renderProgress()
  });
  $('#progressInfo [data-progress-row-open]').forEach(row=>{
    row.onclick=e=>{if(e.target.closest('button,a,input,select,label'))return;openMap(row.dataset.progressRowOpen)};
    row.onkeydown=e=>{if(e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();openMap(row.dataset.progressRowOpen)}
  });
  if(typeof applyMapCoverAccents==='function')applyMapCoverAccents($('#progressInfo'))
}

