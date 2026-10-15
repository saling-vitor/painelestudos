'use strict';async function loadBundledJson(path,label){if('caches'in window)try{const hit=await caches.match(new URL(path,location.href).href,{ignoreSearch:true});if(hit)return await hit.json()}catch{}const r=await fetch(path);if(!r.ok)throw new Error(label+' '+r.status);return r.json()}async function boot(){const recoveryReturnRequested=new URLSearchParams(location.search).get('password-recovery')==='1',authRedirect=StudyCloud.consumeAuthRedirect?.(),results=await Promise.allSettled([loadBundledJson('data/catalog.json','Catálogo'),loadBundledJson('data/simulados.json','Simulados'),loadBundledJson('data/search-index.json','Índice de busca')]);if(results[0].status==='fulfilled')state.catalog=results[0].value;else{console.error(results[0].reason);toast('Falha ao carregar catálogo local.')}if(results[1].status==='fulfilled'&&Array.isArray(results[1].value?.simulations))state.simulationCatalog=results[1].value;else{state.simulationCatalog={simulations:[]};if(results[1].status==='rejected')console.warn('Catálogo de simulados indisponível',results[1].reason)}if(results[2].status==='fulfilled'&&Array.isArray(results[2].value?.items))state.searchIndex=results[2].value;else{state.searchIndex={version:1,items:[]};if(results[2].status==='rejected')console.warn('Índice de busca indisponível',results[2].reason)}migrateSimulationAttempts();sanitizeMapActivityHistory();const bootSession=StudyCloud.session();if(bootSession){restoreCloudCache();addLocalCourseDrafts();loadCoverOverridesLocal();await hydrateCustomCovers({cacheOnly:true,refresh:false}).catch(()=>{})}state.cloudStatusEvaluated=true;sanitizeGlobalSearchAutofill();updateCloudUI();const recoveryPending=authRedirect?.type==='recovery'||StudyCloud.passwordRecoveryPending?.();if(recoveryPending){const recoveryUser=await StudyCloud.me().catch(()=>null);if(recoveryUser?.id&&StudyCloud.session()?.access_token){writeRoute('#settings',{replace:true});nav('settings',{history:false});$('#newPassword').value='';$('#newPasswordConfirm').value='';setPasswordRecoveryNotice('');openModal('passwordRecoveryModal');setTimeout(()=>$('#newPassword')?.focus(),0)}else{await StudyCloud.signOut().catch(()=>{});StudyCloud.clearPasswordRecovery?.();history.replaceState(null,'',location.pathname+'#settings');nav('settings',{history:false});toast('O link de recuperação expirou. Solicite um novo e-mail.')}}else if(recoveryReturnRequested){StudyCloud.clearPasswordRecovery?.();history.replaceState(null,'',location.pathname+'#settings');nav('settings',{history:false});toast('O link de recuperação expirou. Solicite um novo e-mail.')}else{await restoreRouteFromLocation({normalizeInvalid:false});void refreshCloudInBackground()}refreshOfflineStatus().catch(()=>{});void setupAppUpdates();}$$('[data-nav]').forEach(b=>b.onclick=()=>nav(b.dataset.nav));const globalSearch=$('#globalSearch');globalSearch.addEventListener('keydown',()=>{globalSearch.dataset.userEditing='1';globalSearch.dataset.userEntered='1'});globalSearch.addEventListener('paste',()=>{globalSearch.dataset.userEditing='1';globalSearch.dataset.userEntered='1'});globalSearch.addEventListener('drop',()=>{globalSearch.dataset.userEditing='1';globalSearch.dataset.userEntered='1'});globalSearch.addEventListener('blur',()=>{delete globalSearch.dataset.userEditing;if(!String(globalSearch.value||'').trim())delete globalSearch.dataset.userEntered});globalSearch.addEventListener('focus',()=>{sanitizeGlobalSearchAutofill();renderGlobalSearchPanel()});globalSearch.addEventListener('input',()=>{const raw=String(globalSearch.value||'').trim();if(isAutofilledEmailSearch(raw)){state.globalQuery='';sanitizeGlobalSearchAutofill();if(state.view==='maps')renderAllMaps();return}state.globalQuery=raw;renderGlobalSearchPanel();if(state.view==='maps')renderAllMaps()});globalSearch.addEventListener('keydown',e=>{if(handleGlobalSearchPanelKeydown(e))return;if(e.key!=='Enter')return;const raw=String(globalSearch.value||'').trim();if(isAutofilledEmailSearch(raw)){state.globalQuery='';sanitizeGlobalSearchAutofill()}else{state.globalQuery=raw}hideGlobalSearchPanel();nav('maps',{preserveSearch:true});renderAllMaps()});window.addEventListener('pageshow',()=>{armGlobalSearchAutofillGuard();maybeCheckAppUpdate().catch(()=>{})});window.addEventListener('popstate',()=>{restoreRouteFromLocation({normalizeInvalid:true}).catch(error=>console.warn('Falha ao restaurar rota:',error))});window.addEventListener('message',e=>{const frame=$('#readerFrame');if(e.origin!==location.origin||e.source!==frame?.contentWindow)return;if(e.data?.type==='study-map-activity'){markStudyActivity();return}if(e.data?.type!=='study-map-save-status')return;const labels={saving:['Salvando…','saving'],synced:['✓ Sincronizado','synced'],offline:['Offline · salvo neste aparelho','offline'],local:['✓ Salvo neste aparelho','local'],error:['Não sincronizado','error']},entry=labels[e.data.status];if(entry)setReaderSaveStatus(entry[0],entry[1])});window.addEventListener('message',e=>{const frame=$('#simulationFrame');if(e.source!==frame?.contentWindow||e.data?.type!=='MEUS_MAPAS_SIM_RESULT')return;recordSimulationResult(e.data.payload||{})});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){setTimeout(sanitizeGlobalSearchAutofill,50);maybeCheckAppUpdate().catch(()=>{})}});document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();const search=$('#globalSearch');search.focus();setTimeout(()=>renderGlobalSearchPanel(),0)}if(e.key==='Escape'){if(state.readerFocus&&$('#reader').classList.contains('open')){e.preventDefault();setReaderFocus(false);return}if($('#confirmModal').classList.contains('open')){pendingConfirm=null;closeModal('confirmModal');return}if($('#coverCropModal').classList.contains('open')){cancelCoverCrop();return}if($('#mapManageModal').classList.contains('open')){closeMapAdmin();return}const open=$$('.modal.open');if(open.length){const modal=open[open.length-1];if(modal.id==='whatsNewModal')dismissWhatsNew();else if(modal.id==='simulationManageModal')closeSimulationManage();else closeModal(modal.id);return}if($('#simulationReader').classList.contains('open')){closeSimulation();return}if($('#reader').classList.contains('open'))closeReader()}});$('#readerClose').onclick=()=>closeReader();$('#readerSave').onclick=()=>forceSaveCurrentMap();$('#readerSync').onclick=()=>{closeReaderMoreMenu();syncNow()};$('#readerFocusBtn').onclick=toggleReaderFocus;$('#readerFocusExit').onclick=()=>setReaderFocus(false);$('#homeReviewNowBtn').onclick=()=>startReviewQueue();$('#reviewNextBtn').onclick=()=>openReviewQueueItem($('#reviewNextBtn').dataset.mapKey);$('#readerMoreBtn').onclick=e=>{e.stopPropagation();const menu=$('#readerMoreMenu'),open=menu.hidden;menu.hidden=!open;$('#readerMoreBtn').setAttribute('aria-expanded',String(open))};$('#syncTop').onclick=syncNow;$('#installBtn').onclick=async()=>{if(!installPrompt)return toast('A instalação aparece quando o navegador considerar o PWA instalável.');installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#installBtn').hidden=true};window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').hidden=false});$('#newCourseBtn').onclick=openNewCourseModal;$('#newCourseBtn2').onclick=openNewCourseModal;$('#courseCancel').onclick=()=>{resetCoursePdfAutofill();closeModal('courseModal')};$('#courseEditalFile').onchange=handleCourseEditalAutofill;$('#courseSave').onclick=createCourse;$('#manageCourseBtn').onclick=()=>{closeCourseMoreMenu();openCourseAdmin()};$('#openManageEditalBtn').onclick=()=>openCourseEdital(state.adminCourseId);$('#uploadCourseEditalBtn').onclick=replaceCourseEdital;$('#removeCourseEditalBtn').onclick=requestRemoveCourseEdital;$('#courseManageClose').onclick=()=>closeModal('courseManageModal');$('#courseManageSave').onclick=saveCourseAdmin;$('#courseCoverReplaceBtn').onclick=()=>$('#courseCoverFile').click();$('#courseCoverFile').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)saveCourseCoverFile(file).catch(err=>{courseCoverNotice(err.message,'error');toast(err.message)})};$('#courseCoverResetBtn').onclick=requestResetCourseCover;$('#courseArchiveBtn').onclick=toggleCourseArchive;$('#courseClearMapsBtn').onclick=requestClearCourseMaps;$('#courseDeleteBtn').onclick=requestDeleteCourse;$('#mapManageClose').onclick=closeMapAdmin;$('#mapUseBundledBtn').onclick=useBundledMapContent;$('#mapManageSave').onclick=saveMapAdmin;$('#manageMapCategory').onchange=e=>{const accentSelect=$('#manageMapAccent');if(accentSelect)accentSelect.value=accentForCategory(e.target.value||'Outros')};$('#mapDeleteBtn').onclick=requestDeleteMap;$('#mapHtmlUpdateFromManage').onclick=()=>openMapHtmlUpdate(state.adminMapKey);$('#mapUpdateClose').onclick=closeMapHtmlUpdate;$('#mapUpdateCancel').onclick=closeMapHtmlUpdate;$('#mapUpdateFile').onchange=e=>prepareMapHtmlUpdateFile(e.target.files?.[0]).catch(err=>{mapUpdate.candidate=null;renderMapUpdatePreview();toast(err.message)});$('#mapUpdateConfirm').onclick=()=>requestMapHtmlUpdate().catch(err=>toast(err.message));$('#coverReplaceBtn').onclick=()=>$('#coverFileInput').click();$('#coverFileInput').onchange=e=>{const file=e.target.files?.[0];e.target.value='';chooseCoverFile(file).catch(err=>{setCoverNotice(err.message,'error');toast(err.message)})};$('#coverAdjustBtn').onclick=adjustCurrentCover;$('#coverResetBtn').onclick=requestResetCover;$('#coverSaveBtn').onclick=saveCoverOverride;$('#coverCropClose').onclick=cancelCoverCrop;$('#coverCropCancel').onclick=cancelCoverCrop;$('#coverCropReset').onclick=resetCoverCrop;$('#coverCropApply').onclick=applyCoverCrop;$('#coverCropZoom').oninput=e=>{coverEdit.zoom=Number(e.target.value)||1;drawCoverCrop()};$('#coverCropX').oninput=e=>{coverEdit.x=(Number(e.target.value)-50)/50;drawCoverCrop()};$('#coverCropY').oninput=e=>{coverEdit.y=(Number(e.target.value)-50)/50;drawCoverCrop()};$('#coverCropCanvas').addEventListener('pointerdown',handleCoverCropPointerDown);$('#coverCropCanvas').addEventListener('pointermove',handleCoverCropPointerMove);$('#coverCropCanvas').addEventListener('pointerup',handleCoverCropPointerUp);$('#coverCropCanvas').addEventListener('pointercancel',handleCoverCropPointerUp);$('#confirmClose').onclick=()=>{pendingConfirm=null;closeModal('confirmModal')};$('#confirmCancel').onclick=()=>{pendingConfirm=null;closeModal('confirmModal')};$('#confirmAccept').onclick=executeConfirm;$('#importBtn').onclick=openImportDialog;$('#importBtn2').onclick=()=>{closeCourseMoreMenu();openImportDialog()};$('#importCancel').onclick=()=>closeModal('importModal');$('#importCourse').onchange=renderImportPreview;$('#importCategory').onchange=renderImportPreview;$('#importFile').onchange=e=>prepareImportFiles(e.target.files).catch(err=>toast(err.message));$('#importConfirm').onclick=importMaps;$('#saveConfig').onclick=saveConfig;$('#signIn').onclick=()=>auth('signin');$('#signUp').onclick=()=>auth('signup');$('#forgotPassword').onclick=requestPasswordRecovery;$('#signOut').onclick=logout;$('#switchAccount').onclick=requestSwitchAccount;$('#passwordRecoverySave').onclick=saveRecoveredPassword;$('#passwordRecoveryClose').onclick=()=>closeModal('passwordRecoveryModal');$('#newPasswordConfirm').addEventListener('keydown',e=>{if(e.key==='Enter')saveRecoveredPassword()});$('#syncSettings').onclick=syncNow;$('#downloadBackupBtn').onclick=downloadStudyBackup;$('#restoreBackupBtn').onclick=()=>$('#restoreBackupFile').click();$('#restoreBackupFile').onchange=e=>{const file=e.target.files?.[0];e.target.value='';prepareStudyBackupRestore(file).catch(err=>toast(err.message))};$('#simulationHistoryClose').onclick=closeSimulationHistory;$('#whatsNewClose').onclick=dismissWhatsNew;$('#whatsNewAccept').onclick=dismissWhatsNew;$('#copyAppDiagnosticBtn').onclick=copyAppDiagnostic;$('#checkAppUpdateBtn').onclick=()=>checkForAppUpdate({silent:false});$('#forceAppRefreshBtn').onclick=forceAppRefresh;$('#applyAppUpdateBtn').onclick=applyAppUpdate;$('#dismissAppUpdateBtn').onclick=()=>{const version=appUpdateState.latest?.version||'waiting';try{sessionStorage.setItem('studyapp.updateBannerDismissed',version)}catch{}$('#appUpdateBanner').hidden=true};$('#applyAppUpdateBannerBtn').onclick=applyAppUpdate;$('#prepareOfflineBtn').onclick=prepareOfflineLibrary;$('#cloudHealthBtn').onclick=runCloudHealth;$('#deviceProbeCreate').onclick=createDeviceProbe;$('#deviceProbeCheck').onclick=checkDeviceProbe;$('#courseSearch').oninput=e=>{state.query=e.target.value;renderCurrentMaps()};$('#layoutGrid').onclick=()=>{state.mapLayout='grid';localStorage.setItem('studyapp.mapLayout','grid');touchPreferences();renderCurrentMaps()};$('#layoutList').onclick=()=>{state.mapLayout='list';localStorage.setItem('studyapp.mapLayout','list');touchPreferences();renderCurrentMaps()};$('#courseMoreBtn').onclick=e=>{e.stopPropagation();toggleCourseMoreMenu()};$('#backCourses').onclick=()=>nav('courses');document.addEventListener('click',e=>{if(!e.target.closest('.global-search-shell'))hideGlobalSearchPanel();if(!e.target.closest('[data-map-menu],[data-map-actions]'))closeMapActionMenus();if(!e.target.closest('[data-simulation-menu],[data-simulation-actions]'))closeSimulationActionMenus();if(!e.target.closest('.course-more-wrap,#courseMoreMenu'))closeCourseMoreMenu();if(!e.target.closest('.reader-more-wrap'))closeReaderMoreMenu()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMapActionMenus();closeSimulationActionMenus();closeCourseMoreMenu();closeReaderMoreMenu()}});window.addEventListener('resize',scheduleCourseMoreMenuPosition,{passive:true});window.addEventListener('scroll',scheduleCourseMoreMenuPosition,{passive:true,capture:true});window.addEventListener('online',()=>syncNow(true));window.addEventListener('offline',()=>{updateCloudUI();refreshOfflineStatus().catch(()=>{})});window.addEventListener('studycloud:queuechange',()=>updateCloudUI());window.addEventListener('storage',e=>{if(/^mindmap_(state|notes)::/.test(e.key||'')){const now=new Date().toISOString();try{localStorage.setItem('studyapp.modified::'+e.key,now)}catch{}const m=mapByStorageKey(e.key),isCurrent=!!(m&&state.readerMapKey===(m._key||mapKey(m)));if(m)touchMapActivity(m,now);if(navigator.onLine===false){StudyCloud?.syncStorageKey(e.key).catch(()=>{});if(isCurrent)setReaderSaveStatus('Offline · salvo neste aparelho','offline')}else if(StudyCloud.configured()&&StudyCloud.session()){if(isCurrent)setReaderSaveStatus('Salvando…','saving');StudyCloud.syncStorageKey(e.key).then(()=>{if(isCurrent)setReaderSaveStatus('✓ Sincronizado','synced')}).catch(()=>{if(isCurrent)setReaderSaveStatus('Não sincronizado','error')})}else if(isCurrent)setReaderSaveStatus('✓ Salvo neste aparelho','local');refreshActiveView()}});$('#simulationReaderClose').onclick=()=>closeSimulation();$('#simulationReaderSync').onclick=syncNow;$('#importSimulationBtn').onclick=openSimulationImportDialog;$('#simulationImportCancel').onclick=()=>closeModal('simulationImportModal');$('#simulationImportCancel2').onclick=()=>closeModal('simulationImportModal');$('#simulationImportFile').onchange=e=>prepareSimulationImportFiles(e.target.files).catch(err=>toast(String(err?.message||err)));$('#simulationImportCourse').onchange=()=>{syncSimulationCandidateEdits();renderSimulationImportPreview()};$('#simulationImportCover').onchange=updateSimulationImportCoverPreview;$('#simulationImportPreview').addEventListener('input',()=>{syncSimulationCandidateEdits();updateSimulationImportCoverPreview()});$('#simulationImportPreview').addEventListener('change',()=>{$('#simulationImportConfirm').disabled=!$('#simulationImportPreview').querySelector('[data-simulation-import-select]:checked');updateSimulationImportCoverPreview()});$('#simulationImportConfirm').onclick=importSimulations;$('#simulationSearch').oninput=e=>{state.simulationQuery=e.target.value;renderSimulations()};$('#simulationCourseFilter').onchange=e=>{state.simulationCourseFilter=e.target.value;renderSimulations()};$('#simulationBoardFilter').onchange=e=>{state.simulationBoardFilter=e.target.value;renderSimulations()};$('#courseSimulationsBtn').onclick=()=>{state.simulationCourseFilter=state.courseId||'';state.simulationBoardFilter='';state.simulationQuery='';nav('simulations')};$$('[data-go-simulations]').forEach(b=>b.onclick=()=>nav('simulations'));$('#simulationManageClose').onclick=closeSimulationManage;$('#manageSimulationCover').onchange=updateManageSimulationCoverPreview;$('#manageSimulationBoard').oninput=updateManageSimulationCoverPreview;$('#simulationManageSave').onclick=saveSimulationManage;$('#simulationDeleteBtn').onclick=()=>requestDeleteSimulation();$('#simulationCoverReplaceBtn').onclick=()=>$('#manageSimulationCoverFile').click();$('#manageSimulationCoverFile').onchange=e=>{const file=e.target.files?.[0];e.target.value='';chooseSimulationCoverFile(file).catch(err=>toast(String(err?.message||err)))};$('#simulationCoverResetBtn').onclick=requestResetSimulationCover;$('#simulationRereadMetaBtn').onclick=()=>rereadSimulationMetadata().catch(err=>toast(String(err?.message||err)));$('#simulationReplaceHtmlFile').onchange=e=>prepareSimulationHtmlReplacement(e.target.files?.[0]).catch(err=>toast(String(err?.message||err)));$('#simulationReplaceHtmlBtn').onclick=()=>replaceSimulationHtmlNow().catch(err=>toast(String(err?.message||err)));$('#simulationDuplicateBtn').onclick=()=>duplicateSimulation(state.adminSimulationKey).catch(err=>toast(String(err?.message||err)));$('#simulationExportBtn').onclick=()=>exportSimulation(state.adminSimulationKey).catch(err=>toast(String(err?.message||err)));$('#simulationResetProgressBtn').onclick=requestResetSimulationProgress;armGlobalSearchAutofillGuard();boot().finally(()=>{document.documentElement.classList.remove('app-booting');document.documentElement.classList.add('app-ready')});

/* V15.48.176-G · runtime editorial integrado ao bootstrap canônico */
'use strict';
/* MEUS MAPAS — pranchas editoriais. Leituras derivadas exclusivamente dos modelos operacionais existentes.
 * Não duplica cronômetro, progresso, cursos ou simulados e não remove elementos do leitor V211.
 */
(()=>{
  if(window.__meusMapasPranchas)return;
  window.__meusMapasPranchas=true;
  const $=s=>document.querySelector(s);
  const escapeHtml=v=>{const x=document.createElement('span');x.textContent=String(v??'');return x.innerHTML};
  const safe=(f,fallback)=>{try{const v=f();return v==null?fallback:v}catch{return fallback}};
  const num=n=>Number.isFinite(Number(n))?Number(n):0;
  const pct=p=>p&&p.total?Math.min(100,Math.max(0,Math.round(100*num(p.marked)/num(p.total)))):0;
  const percent=p=>p&&p.total?pct(p)+'%':'—';
  const shortDate=d=>d instanceof Date&&Number.isFinite(d.getTime())?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'Sem data';
  const dayKey=d=>new Date(d).toLocaleDateString('sv-SE');
  const courseDate=c=>{
    const raw=String(c?.examDate||c?.exam_date||'');
    const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/)||raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if(!m)return null;
    const y=raw.includes('/')?num(m[3]):num(m[1]),mo=num(m[2])-1,day=raw.includes('/')?num(m[1]):num(m[3]);
    const date=new Date(y,mo,day,12);
    return date.getFullYear()===y&&date.getMonth()===mo&&date.getDate()===day?date:null;
  };
  const daysTo=date=>{
    if(!date)return null;
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
    return Math.round((date-today)/86400000);
  };
  const statusText=p=>p.total?(num(p.pending)+' pendentes · '+num(p.review)+' em revisão · '+num(p.difficult)+' difíceis'):'Ainda sem tópicos catalogados';
  const maps=()=>safe(()=>combinedMaps(),[]);
  const courses=()=>safe(()=>combinedCourses(),[]);
  const simulations=()=>safe(()=>combinedSimulations(),[]);
  const progress=m=>safe(()=>mapProgress(m),{total:0,marked:0,done:0,review:0,difficult:0,pending:0});
  const totals=rows=>rows.reduce((a,m)=>{
    const p=progress(m);
    for(const k of ['total','marked','done','review','difficult','pending'])a[k]+=num(p[k]);
    return a;
  },{total:0,marked:0,done:0,review:0,difficult:0,pending:0});
  const stateData=()=>{
    const cs=courses(),ms=maps(),rank=cs.filter(c=>c.status!=='archived').map(c=>({course:c,date:courseDate(c)}))
      .sort((a,b)=>{
        const deltaA=daysTo(a.date),deltaB=daysTo(b.date);
        const band=x=>x==null?1:x>=0?0:2;
        const pa=band(deltaA),pb=band(deltaB);
        if(pa!==pb)return pa-pb;
        if(pa===0)return deltaA-deltaB;
        if(pa===2)return deltaB-deltaA;
        return String(a.course.title||'').localeCompare(String(b.course.title||''),'pt-BR');
      });
    const current=rank.find(x=>daysTo(x.date)>=0)||rank[0]||null;
    const reviews=safe(()=>reviewScheduleSummary(ms),{due:[],upcoming:[],dueCount:0});
    const session=safe(()=>StudyDashboard.active(),null);
    const dashboard=safe(()=>StudyDashboard.exportData(),{agenda:[],sessions:[],doubts:[],goals:{}});
    return{cs,ms,rank,current,reviews,session,dashboard,all:totals(ms)};
  };
  const fragment=(label,value,detail='')=>'<div class="pr-stat"><span>'+escapeHtml(label)+'</span><b>'+escapeHtml(value)+'</b>'+(detail?'<small>'+escapeHtml(detail)+'</small>':'')+'</div>';
  const box=(title,body,cls='')=>'<section class="pr-card '+cls+'"><h3>'+escapeHtml(title)+'</h3>'+body+'</section>';
  const blank=text=>'<p class="pr-empty">'+escapeHtml(text)+'</p>';
  const action=(text,kind,arg,style='')=>'<button type="button" class="pr-action '+style+'" data-pr-action="'+escapeHtml(kind)+'" data-pr-id="'+escapeHtml(arg||'')+'">'+escapeHtml(text)+'</button>';
  const header=(k,title,summary,stats)=>'<div class="pr-stamp"><div class="pr-stamp-copy"><span class="pr-kicker">'+escapeHtml(k)+'</span><h2>'+escapeHtml(title)+'</h2><p>'+escapeHtml(summary)+'</p></div><div class="pr-stats">'+stats+'</div></div>';
  const mapId=m=>String(m?._key||safe(()=>mapKey(m),'')||m?.id||'');
  const mapName=m=>m?.shortTitle||m?.title||m?.code||'Mapa';
  const mapRows=(rows,limit=12)=>rows.slice(0,limit).map((m,i)=>{
    const p=progress(m);
    return '<button class="pr-map-row" data-pr-action="map" data-pr-id="'+escapeHtml(mapId(m))+'"><span class="pr-folio">F'+String(i+1).padStart(2,'0')+'</span><span class="pr-map-title"><strong>'+escapeHtml(m.code||mapName(m))+'</strong><small>'+escapeHtml(mapName(m))+'</small></span><span class="pr-map-meter"><i style="width:'+pct(p)+'%"></i></span><b>'+escapeHtml(percent(p))+'</b></button>';
  }).join('');
  const todaySeconds=()=>safe(()=>StudyTime.today(),0);
  const minText=seconds=>Math.round(num(seconds)/60)+' min';
  const clockText=seconds=>{const v=Math.max(0,Math.floor(num(seconds))),h=Math.floor(v/3600),m=Math.floor(v/60)%60,x=v%60;return[h,m,x].map(n=>String(n).padStart(2,'0')).join(':')};
  const getCourseMaps=(s,c)=>s.ms.filter(m=>m.courseId===c?.id);
  const cardContainer=(view,id,placement='first')=>{
    const node=$('[data-view="'+view+'"]');
    if(!node)return null;
    let target=node.querySelector('#'+id);
    if(!target){target=document.createElement('div');target.id=id;target.className='pr-root';if(placement==='last')node.appendChild(target);else node.prepend(target)}
    return target;
  };
  let screen='hoje',manualHome=false,coursePresentation='lista',libPresentation='grade',simPresentation='lista',selectedProgress='';
  const expandedSimErrors=new Set();
  const homeScreens=[['hoje','Hoje'],['todos','Todos'],['revisoes','Revisões'],['sessao','Em sessão'],['pos','Pós-prova']];
  function homeHtml(s){
    const exam=s.current,cp=exam?totals(getCourseMaps(s,exam.course)):null,days=daysTo(exam?.date);
    const done=s.cs.filter(c=>c.status==='archived'),completed=s.rank.filter(x=>daysTo(x.date)<0);
    const due=(s.reviews.due||[]).length,upcoming=(s.reviews.upcoming||[]).length;
    const reviewTopics=s.ms.reduce((a,m)=>a+num(progress(m).review),0);
    const tab='<div class="pr-switch" role="group" aria-label="Telas do Início">'+homeScreens.map(([key,label])=>'<button class="pr-switch-btn" type="button" data-pr-home="'+key+'" aria-pressed="'+(screen===key)+'">'+label+(key==='revisoes'&&due?' <small>'+due+'</small>':'')+'</button>').join('')+'</div>';
    let content='';
    if(screen==='hoje'){
      const tip=exam?(days===0?'A prova acontece hoje.':days>0?'Faltam '+days+' dias para a próxima prova.':'A prova já passou; consulte o fechamento.'):'Cadastre uma data de prova para priorizar seus estudos.';
      const plan=safe(()=>StudyCoach.snapshot(),null);
      const items=Array.isArray(plan?.items)?plan.items:[];
      content=header('01 · Planejamento de hoje',exam?exam.course.title||'Próxima prova':'Seu estudo de hoje',tip,
        fragment('Até a prova',days==null?'—':days===0?'Hoje':days+' dias',shortDate(exam?.date))+
        fragment('Cobertura',percent(cp||s.all),(cp||s.all).marked+' de '+(cp||s.all).total+' tópicos')+
        fragment('Hoje',minText(todaySeconds()),'Tempo registrado')+
        fragment('Revisões',due+' mapas',reviewTopics+' tópicos marcados REV'));
      content+=box('Próxima ação',items.length?'<p>'+escapeHtml(items[0].title||items[0].label||'Estudo planejado')+'</p><p class="pr-muted">'+escapeHtml(items[0].reason||'Sugerido pelo planejamento existente')+'</p>'+action('Iniciar estudo','study','','pr-primary'):blank('Sem ação planejada. Use a Agenda ou abra um mapa para começar.'));
      content+=box('Planta do edital',exam&&getCourseMaps(s,exam.course).length?mapRows(getCourseMaps(s,exam.course),30)+action('Abrir concurso','course',exam.course.id):blank('Nenhum mapa disponível para este concurso.'));
      content+=box('Continuidade',action('Abrir Agenda','nav','agenda')+' '+action('Consultar revisões','home','revisoes')+' '+action('Ver meus cursos','nav','courses'));
    }else if(screen==='todos'){
      content=header('02 · Visão geral','Todos os concursos',s.cs.length+' concursos e '+s.ms.length+' mapas, calculados a partir da biblioteca cadastrada.',
        fragment('Cobertura total',percent(s.all),s.all.marked+' de '+s.all.total+' tópicos')+
        fragment('Concursos',String(s.cs.length),'Inclui arquivados')+
        fragment('Mapas',String(s.ms.length),'Biblioteca atual')+
        fragment('Próxima prova',exam?shortDate(exam.date):'—',exam?.course?.title||'Sem data cadastrada'));
      content+=box('Linha do tempo das provas',s.rank.length?s.rank.map(x=>{
        const p=totals(getCourseMaps(s,x.course)),n=daysTo(x.date);
        return '<div class="pr-course-line"><div><strong>'+escapeHtml(x.course.title||'Concurso')+'</strong><small>'+escapeHtml(n==null?'Sem data':n<0?'Prova realizada':n===0?'Hoje':n+' dias')+'</small></div><span class="pr-line"><i style="width:'+pct(p)+'%"></i></span><b>'+percent(p)+'</b>'+action('Entrar','course',x.course.id)+'</div>';
      }).join(''):blank('Nenhum concurso ativo. Configure seus concursos para visualizar os prazos.'));
    }else if(screen==='revisoes'){
      content=header('03 · Fila de revisões','Revisões previstas',due?'Há '+due+' mapas com revisão vencida ou para hoje.':'Não há revisões vencidas registradas.',
        fragment('Mapas a revisar',String(due),'Hoje e vencidos')+
        fragment('Tópicos em REV',String(reviewTopics),'Estados reais')+
        fragment('Próximos',String(upcoming),'Mapas com revisão futura'));
      content+=box('Fila de prioridade',due?(s.reviews.due||[]).slice(0,30).map(r=>{
        const m=r.map,p=progress(m);
        return '<div class="pr-course-line"><div><b>'+escapeHtml(m.code||mapName(m))+'</b><small>'+escapeHtml(safe(()=>reviewDueLabel(r),'Revisão prevista'))+' · '+p.review+' REV · '+p.difficult+' DIF</small></div>'+action('Abrir','map',mapId(m))+action('Adiar 1 dia','postpone-review',mapId(m))+'</div>';
      }).join('')+action('Iniciar fila','review','', 'pr-primary'):blank('Fila em dia. Novas revisões surgem quando o agendamento existente marcar vencimento.'));
      content+=box('Próximos sete dias',(s.reviews.upcoming||[]).slice(0,20).map(r=>'<div class="pr-course-line"><span>'+escapeHtml(r.map.code||mapName(r.map))+'</span><small>'+escapeHtml(shortDate(new Date(r.schedule?.dueAt)))+'</small></div>').join('')||blank('Nenhum agendamento futuro encontrado.'));
    }else if(screen==='sessao'){
      const active=s.session,elapsed=safe(()=>StudyDashboard.elapsed(),0),
        activeMap=active?.mapKey?safe(()=>mapById(active.mapKey),null):null,
        mapStats=activeMap?progress(activeMap):null,
        futurePlan=safe(()=>StudyCoach.snapshot()?.items||[],[]),
        nextBlock=futurePlan.find(item=>item.key&&item.key!==active?.mapKey);
      content=header('04 · Em sessão','Cronômetro de estudo',active?'Sessão real do aplicativo. O tempo é registrado pelo cronômetro já existente.':'Nenhuma sessão ativa. Inicie pelo plano ou por um mapa.',
        '<div class="pr-stat"><span>Duração</span><b data-pr-clock>'+clockText(elapsed)+'</b><small>Contabilizada pelo cronômetro original</small></div>'+
        fragment('Estado',active?(active.running?'Em curso':'Pausado'):'Parado')+
        fragment('Mapa',active?.mapKey?mapName(safe(()=>mapById(active.mapKey),null)):'—'));
      content+=box('Controle da sessão',active?
        action(active.running?'Pausar':'Retomar',active.running?'pause':'resume','','pr-primary')+' '+action('Finalizar','finish','')+(active.mapKey?action('Abrir mapa','map',active.mapKey):''):
        action('Iniciar pelo plano','study','','pr-primary'));
      if(activeMap){
        content+=box('Tópicos da sessão',fragment('Marcados',mapStats.marked+' / '+mapStats.total)+
          fragment('Revisão',String(mapStats.review))+
          fragment('Difíceis',String(mapStats.difficult))+
          (nextBlock?.key?action('Próximo bloco · '+(nextBlock.title||'Estudo'),'map',nextBlock.key):blank('Sem próximo bloco identificado no planejamento atual.')));
      }
    }else{
      const past=completed;
      content=header('05 · Encerramento de prova','Pós-prova',past.length?'Mantenha o histórico dos concursos realizados. O arquivamento não elimina mapas nem resultados.':'Ainda não há uma prova passada entre os concursos ativos.',
        fragment('Provas passadas',String(past.length),'Não arquivadas')+
        fragment('Arquivados',String(done.length),'Histórico preservado')+
        fragment('Próxima prova',exam&&daysTo(exam.date)>=0?shortDate(exam.date):'—'));
      content+=box('Conferência e arquivamento',past.length?past.map(x=>{
        const registered=!!safe(()=>readExamStatuses()[x.course.id]?.completed,false);
        return '<div class="pr-course-line"><div><strong>'+escapeHtml(x.course.title||'Concurso')+'</strong><small>Prova em '+escapeHtml(shortDate(x.date))+
          ' · '+(registered?'Marcada como realizada':'Conferência pendente')+' · gabarito oficial deve ser conferido na fonte da banca</small></div>'+
          action(registered?'Desmarcar realizada':'Marcar realizada','exam-status',x.course.id)+
          action('Gerenciar','manage-course',x.course.id)+'</div>';
      }).join(''):blank('Quando a data de uma prova passar, o concurso aparecerá aqui.'));
      if(done.length)content+=box('Concursos arquivados',done.map(c=>'<div class="pr-course-line"><strong>'+escapeHtml(c.title||'Concurso')+'</strong>'+
        action('Reativar','archive-course',c.id)+'</div>').join(''));
      content+=box('Retomar o planejamento',s.current&&daysTo(s.current.date)>=0?action('Próximo concurso','course',s.current.course.id):action('Ver concursos','nav','courses')+' '+action('Abrir Agenda','nav','agenda'));
    }
    return tab+content;
  }
  function renderHomeEditorial(){
    const node=cardContainer('home','editorialHome','last');if(!node)return;
    const s=stateData();
    // Eventos prioritários têm precedência sobre a escolha manual anterior:
    // a sessão em andamento e o primeiro dia após a prova não devem ficar escondidos.
    const examJustFinished=s.rank.some(x=>daysTo(x.date)===-1&&!safe(()=>readExamStatuses()[x.course.id]?.completed,false));
    if(s.session?.running||s.session?.active)screen='sessao';
    else if(examJustFinished)screen='pos';
    else if(!manualHome)screen='hoje';
    node.closest('.view').dataset.editorialMode=screen;
    node.innerHTML=homeHtml(s);
  }
  function renderCoursesEditorial(){
    const node=cardContainer('courses','editorialCourses');if(!node)return;
    const s=stateData(),priority=new Map(s.rank.map((entry,i)=>[entry.course.id,i])),
      list=s.cs.map(c=>({c,p:totals(getCourseMaps(s,c)),date:courseDate(c)}))
        .sort((a,b)=>(a.c.status==='archived')-(b.c.status==='archived')||
          (priority.get(a.c.id)??Infinity)-(priority.get(b.c.id)??Infinity)||
          String(a.c.title||'').localeCompare(String(b.c.title||''),'pt-BR'));
    node.innerHTML=header('Índice · Concursos','Meus Cursos','A ordem segue a data de cada prova; os dados vêm dos concursos e mapas já cadastrados.',
      fragment('Concursos',String(s.cs.length))+
      fragment('Mapas',String(s.ms.length))+
      fragment('Cobertura total',percent(s.all),s.all.marked+' de '+s.all.total+' tópicos'))+
      box('Concursos por prioridade',list.map(row=>'<div class="pr-course-line"><div><strong>'+escapeHtml(row.c.title||'Concurso')+'</strong><small>'+escapeHtml(row.date?shortDate(row.date):'Sem data de prova')+' · '+escapeHtml(row.c.status==='archived'?'Arquivado':statusText(row.p))+'</small></div><span class="pr-line"><i style="width:'+pct(row.p)+'%"></i></span><b>'+percent(row.p)+'</b>'+action('Entrar','course',row.c.id)+'</div>').join('')||blank('Entre na conta ou crie um concurso para começar.'));
  }
  function renderCourseEditorial(){
    const node=cardContainer('course','editorialCourse','last');if(!node)return;
    const s=stateData(),c=s.cs.find(x=>x.id===state.courseId),list=getCourseMaps(s,c),p=totals(list),date=courseDate(c);
    const switcher='<div class="pr-switch" role="group" aria-label="Visualização dos mapas do curso">'+['lista','capas'].map(k=>'<button class="pr-switch-btn" data-pr-course-layout="'+k+'" aria-pressed="'+(coursePresentation===k)+'">'+(k==='lista'?'Lista':'Capas')+'</button>').join('')+'</div>';
    node.closest('.view').dataset.prCourseLayout=coursePresentation;
    node.innerHTML=header('Curso · Ficha do edital',c?.title||'Curso','Progresso do concurso e mapas vinculados.',
      fragment('Cobertura',percent(p),p.marked+' de '+p.total)+
      fragment('Prova',shortDate(date),date?(daysTo(date)<0?'Realizada':daysTo(date)+' dias'):'Data não cadastrada')+
      fragment('Mapas',String(list.length),list.filter(m=>progress(m).pending===0&&progress(m).total>0).length+' concluídos')+
      fragment('Revisões',String(p.review),'Estados REV'))+
      box('Planta do edital e número das folhas',list.length?mapRows(list,100):blank('Nenhum mapa associado.'))+
      '<div class="pr-course-controls">'+switcher+'</div>';
  }
  function renderMapsEditorial(){
    const node=cardContainer('maps','editorialMaps');if(!node)return;
    const s=stateData(),groups=[...new Set(s.ms.map(m=>m.category||'Outros'))];
    const switcher='<div class="pr-switch" role="group" aria-label="Visualizar acervo">'+[['grade','Grade'],['lista','Lista'],['agrupado','Agrupado']].map(([k,l])=>'<button class="pr-switch-btn" data-pr-library="'+k+'" aria-pressed="'+(libPresentation===k)+'">'+l+'</button>').join('')+'</div>';
    node.closest('.view').dataset.prLibraryLayout=libPresentation;
    node.innerHTML=switcher+header('Biblioteca · Índice de pranchas','Todos os Mapas','Localize materiais com os filtros existentes ou mude a forma de apresentação.',
      fragment('Mapas',String(s.ms.length))+
      fragment('Tópicos',String(s.all.total))+
      fragment('Estudados',String(s.all.marked),percent(s.all))+
      fragment('Categorias',String(groups.length)));
    const root=$('#allMaps');if(root)root.classList.toggle('pr-list-view',libPresentation==='lista');
    // O seletor editorial não modifica filtros nativos durante render.
    // Alterações em filtros/agrupamentos são feitas apenas por ação explícita do usuário.
  }
  function recommendedSimDay(sim){
    const duration=Math.max(0,Math.round(num(sim.durationMinutes||sim.duration_minutes)));
    const exam=courseDate(safe(()=>courseById(sim.courseId),null));
    if(!duration||!exam||daysTo(exam)==null||daysTo(exam)<1)return null;
    const cfg=safe(()=>StudyPlanner.settings(),{}),
      allowed=Array.isArray(cfg.availableDays)?cfg.availableDays:null,
      maxDaily=Math.max(0,num(cfg.maxDailyMinutes)),
      rows=safe(()=>StudyDashboard.exportData().agenda,[]).filter(x=>!x.deleted),
      today=new Date();today.setHours(12,0,0,0);
    for(let offset=0;offset<Math.min(100,Math.max(0,daysTo(exam)));offset++){
      const day=new Date(today.getTime());day.setDate(day.getDate()+offset);
      if(allowed&&!allowed.includes(day.getDay()))continue;
      const date=dayKey(day),planned=rows.filter(x=>x.date===date).reduce((sum,x)=>sum+num(x.minutes),0);
      if(maxDaily&&planned+duration>maxDaily)continue;
      return{date,duration,planned,remaining:maxDaily?Math.max(0,maxDaily-planned-duration):null};
    }
    return null;
  }
  function renderSimulationsEditorial(){
    const node=cardContainer('simulations','editorialSimulations');if(!node)return;
    const s=stateData(),ss=simulations();
    const results=ss.map(sim=>({sim,key:safe(()=>simulationKey(sim),''),result:safe(()=>simulationResult(sim),null),attempts:safe(()=>simulationAttemptsFor(sim),[])}));
    const done=results.filter(x=>x.result),attempts=results.reduce((a,x)=>a+x.attempts.length,0);
    const current=done.slice().sort((a,b)=>Date.parse(b.result.finishedAt||0)-Date.parse(a.result.finishedAt||0))[0];
    const sw='<div class="pr-switch" role="group" aria-label="Simulados: lista ou resultado">'+[['lista','Lista'],['resultado','Resultado']].map(([key,label])=>'<button class="pr-switch-btn" data-pr-sim="'+key+'" aria-pressed="'+(simPresentation===key)+'">'+label+'</button>').join('')+'</div>';
    let body=sw+header('Simulados · Ensaio de prova','Treino e resultados','Respostas e tentativas efetivamente registradas; meta pessoal nunca é apresentada como corte oficial.',
      fragment('Disponíveis',String(ss.length))+
      fragment('Com resultado',String(done.length))+
      fragment('Tentativas',String(attempts))+
      fragment('Última nota',current&&current.result.score!=null?String(current.result.score)+'%':'—','Registrada, sem estimativas'));
    if(simPresentation==='resultado'){
      body+=box('Histórico real e disciplinas',done.length?done.map(x=>{
        const r=x.result,sim=x.sim;
        const metrics='<div class="pr-sim-metrics">'+
          fragment('Nota',r.score!=null?Math.max(0,Math.min(100,num(r.score)))+'%':'—')+
          fragment('Acertos',r.correct!=null?String(r.correct):'—')+
          fragment('Erros',r.wrong!=null?String(r.wrong):'—')+
          fragment('Em branco',r.blank!=null?String(r.blank):'—')+'</div>';
        const sections=r.sections&&typeof r.sections==='object'?Object.entries(r.sections).filter(([_,v])=>num(v?.total)>0):[];
        const disciplines=sections.length?'<div class="pr-sim-sections">'+sections.map(([name,raw])=>{
          const total=Math.max(0,num(raw.total)),correct=Math.min(total,Math.max(0,num(raw.correct)));
          return '<div class="pr-sim-section"><span>'+escapeHtml(name)+'</span><span class="pr-line"><i style="width:'+Math.round(correct/total*100)+'%"></i></span><b>'+correct+'/'+total+'</b></div>';
        }).join('')+'</div>':blank('A última tentativa não possui divisão por disciplina registrada.');
        const errors=Array.isArray(r.mistakes)?r.mistakes:[];
        const errorHtml=errors.length?'<details class="pr-sim-errors"'+(expandedSimErrors.has(x.key)?' open':'')+'><summary>'+errors.length+' questões registradas para recuperar</summary>'+
          errors.slice(0,15).map(item=>'<div class="pr-sim-error"><b>Questão '+escapeHtml(item.number||'—')+' · '+escapeHtml(item.topic||item.section||'Sem categoria')+'</b><p>'+escapeHtml(item.stem||'Enunciado indisponível')+'</p>'+(item.answer?'<small>Gabarito registrado: '+escapeHtml(item.answer)+'</small>':'')+'</div>').join('')+
          '</details>':blank('Nenhuma questão errada individualizada nesta tentativa.');
        const validAttempts=x.attempts.filter(a=>Number.isFinite(Number(a.score))).slice(0,10).reverse();
        const trend=validAttempts.length?'<div class="pr-sim-trend" aria-label="Evolução de '+validAttempts.length+' tentativas">'+validAttempts.map((a,i)=>{
          const v=Math.min(100,Math.max(0,num(a.score)));
          return '<div title="Tentativa '+(i+1)+': '+v+'%"><i style="height:'+Math.max(2,v)+'%"></i><small>'+v+'%</small></div>';
        }).join('')+'</div>':blank('Sem resultados suficientes para a evolução.');
        const override=safe(()=>simulationOverride(sim),null),goal=override?.targetScore!=null&&Number.isFinite(Number(override.targetScore))?num(override.targetScore):null;
        const official=sim.officialCutoff!=null&&sim.officialCutoffSource?num(sim.officialCutoff):null;
        const benchmark='<div class="pr-sim-benchmark">'+
          '<div><span>Meta pessoal</span><b>'+(goal==null?'Não configurada':goal+'%')+'</b>'+action('Alterar meta','goal',x.key)+'</div>'+
          '<div><span>Corte oficial</span><b>'+(official==null?'Não informado':official+'%')+'</b><small>'+(official==null?'Sem fonte oficial cadastrada':escapeHtml(sim.officialCutoffSource))+'</small></div></div>';
        return '<article class="pr-sim-report" data-pr-sim-key="'+escapeHtml(x.key)+'"><div class="pr-sim-report-head"><div><strong>'+escapeHtml(sim.title||sim.code||'Simulado')+'</strong>'+
          '<small>'+escapeHtml(r.finishedAt?new Date(r.finishedAt).toLocaleDateString('pt-BR'):'Data indisponível')+' · '+x.attempts.length+' tentativa(s)</small></div>'+
          action('Histórico completo','simulation-history',x.key)+'</div>'+metrics+benchmark+
          '<h4>Desempenho por disciplina</h4>'+disciplines+'<h4>Evolução observada</h4>'+trend+
          '<h4>Erros que geram recuperação</h4>'+errorHtml+(errors.length?action('Ver questões erradas','review-errors',x.key):'')+'</article>';
      }).join(''):blank('Nenhum resultado registrado. Conclua um simulado para visualizar tentativas, erros e desempenho.'));
    }else{
      body+=box('Simulados por concurso',ss.length?ss.slice(0,40).map(sim=>{
        const key=safe(()=>simulationKey(sim),''),
          latest=safe(()=>simulationResult(sim),null),
          suggestion=!latest?recommendedSimDay(sim):null;
        return '<div class="pr-course-line"><div><strong>'+escapeHtml(sim.code||'SIM')+' · '+escapeHtml(sim.title||'Simulado')+'</strong><small>'+escapeHtml(sim.board||'Banca não informada')+
         (latest?' · '+escapeHtml(latest.correct!=null?latest.correct+' acertos registrados':'Concluído'):' · A iniciar')+
         (suggestion?' · cabe em '+escapeHtml(shortDate(new Date(suggestion.date+'T12:00:00')))+' ('+suggestion.duration+' min)':'')+
         (!latest&&!suggestion?' · sem janela confirmada antes da prova':'')+'</small></div>'+
         (suggestion?action('Agendar','plan-sim',key):'')+action(latest?'Consultar':'Iniciar','simulation',key)+'</div>';
      }).join(''):blank('Nenhum simulado disponível para os concursos cadastrados.'));
    }
    node.innerHTML=body;
  }
  const historyKey=()=>{const uid=safe(()=>StudyCloud.session()?.user?.id,'offline')||'offline';return 'studyapp.pranchaProgress.v1::'+uid};
  function recordHistory(s){
    // Integra com o modelo StudyDashboard já usado na sincronização e nos backups.
    // Snapshot só existe a partir de observações reais, sem retroagir dados fictícios.
    if(!s.ms.length||!window.StudyDashboard?.recordProgressSnapshot)return;
    const key=historyKey(),legacy=safe(()=>JSON.parse(localStorage.getItem(key)||'[]'),[]);
    const migrated=Array.isArray(legacy)?legacy:[];
    const byCourse={};
    for(const course of s.cs){
      const p=totals(getCourseMaps(s,course));
      byCourse[course.id]={marked:p.marked,total:p.total};
    }
    const rows=StudyDashboard.recordProgressSnapshot(s.all.marked,s.all.total,migrated,byCourse);
    if(migrated.length&&rows.length)try{localStorage.removeItem(key)}catch{}
  }
  function renderProgressEditorial(){
    const node=cardContainer('progress','editorialProgress');if(!node)return;
    const s=stateData();recordHistory(s);
    const cs=s.cs,choice=cs.find(c=>c.id===selectedProgress);
    const rows=choice?getCourseMaps(s,choice):s.ms,p=totals(rows),hist=safe(()=>StudyDashboard.progressHistory(),[]),
      actual=Array.isArray(hist)?(choice?hist.filter(x=>x.byCourse?.[choice.id]).map(x=>({...x,...x.byCourse[choice.id]})):hist):[];
    const selector='<div class="pr-switch" role="group" aria-label="Selecionar concurso"><button data-pr-progress="" aria-pressed="'+(!choice)+'" class="pr-switch-btn">Todos</button>'+cs.map(c=>'<button class="pr-switch-btn" aria-pressed="'+(choice?.id===c.id)+'" data-pr-progress="'+escapeHtml(c.id)+'">'+escapeHtml(c.title||'Concurso')+'</button>').join('')+'</div>';
    node.innerHTML=selector+header('Progresso · Acompanhamento','Cobertura do edital','O histórico começa na primeira observação real registrada; não são criados dias fictícios.',
      fragment('Cobertura',percent(p),p.marked+' de '+p.total)+
      fragment('Concluídos',String(p.done),'Tópicos OK')+
      fragment('Revisão',String(p.review),'Tópicos REV')+
      fragment('Dificuldades',String(p.difficult),'Tópicos DIF'))+
      box('Evolução histórica observada',actual.length?'<ol class="pr-history">'+actual.slice(-12).map(x=>'<li><time>'+escapeHtml(x.day)+'</time><div class="pr-line"><i style="width:'+(x.total?Math.round(100*x.marked/x.total):0)+'%"></i></div><strong>'+escapeHtml(x.marked)+' / '+escapeHtml(x.total)+'</strong></li>').join('')+'</ol>':blank('Ainda não há histórico de observações.'))+
      box('Planta do edital',rows.length?mapRows(rows,40):blank('Nenhum mapa disponível.'))+
      box('Próximas prioridades',safe(()=>StudyPlanner.priorityRows(),[]).slice(0,3).map(row=>'<div class="pr-course-line"><div><b>'+escapeHtml(mapName(row.map))+'</b><small>'+escapeHtml((row.reasons||[]).join(' · ')||'Prioridade do planejamento')+'</small></div>'+action('Estudar','map',mapId(row.map))+'</div>').join('')||blank('Sem recomendações calculadas.'));
  }
  let agendaFocusDay=new Date();
  const agendaMinutes=value=>{
    const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value||'19:00'));
    return m?Number(m[1])*60+Number(m[2]):19*60;
  };
  const agendaClock=minutes=>String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
  function agendaConflictData(items){
    const periods=items.map(row=>{
      const start=agendaMinutes(row.start),duration=Math.max(5,num(row.minutes)||30);
      return{row,start,end:start+duration};
    }).sort((a,b)=>a.start-b.start);
    const conflicts=new Set();
    for(let i=0;i<periods.length;i++){
      for(let j=i+1;j<periods.length&&periods[j].start<periods[i].end;j++){
        conflicts.add(periods[i].row.id);conflicts.add(periods[j].row.id);
      }
    }
    const settings=safe(()=>StudyPlanner.settings(),{});
    const available=Array.isArray(settings?.availableDays)?settings.availableDays:null;
    const day=new Date(dayKey(agendaFocusDay)+'T12:00:00');
    function suggest(row){
      if(available&&!available.includes(day.getDay()))return null;
      const duration=Math.max(5,num(row.minutes)||30),others=periods.filter(p=>p.row.id!==row.id);
      const original=agendaMinutes(row.start);
      for(let t=Math.max(7*60,Math.ceil((original+15)/15)*15);t+duration<=23*60;t+=15){
        if(others.every(p=>t+duration<=p.start||t>=p.end))return agendaClock(t);
      }
      return null;
    }
    return{periods,conflicts,suggest};
  }
  function renderAgendaEditorial(){
    const node=cardContainer('agenda','editorialAgenda');if(!node)return;
    const s=stateData(),today=new Date(),focus=dayKey(agendaFocusDay);
    const start=new Date(today.getFullYear(),today.getMonth(),today.getDate()-((today.getDay()+6)%7));
    const end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+7);
    const all=(s.dashboard.agenda||[]).filter(item=>!item.deleted&&item.date);
    const week=all.filter(item=>item.date>=dayKey(start)&&item.date<dayKey(end)),planned=week.reduce((a,row)=>a+num(row.minutes),0);
    const day=all.filter(item=>item.date===focus),conf=agendaConflictData(day);
    const completed=(s.dashboard.sessions||[]).filter(row=>!row.deleted&&row.startedAt&&dayKey(new Date(row.startedAt))===focus);
    const examination=s.rank.filter(x=>x.date&&dayKey(x.date)===focus);
    const reviews=s.reviews?.due||[];
    const reviewRows=reviews.filter(x=>x.schedule?.dueAt&&dayKey(new Date(x.schedule.dueAt))===focus);
    const scheduled=new Map();
    for(const item of conf.periods){
      const slot=Math.floor(item.start/60);if(!scheduled.has(slot))scheduled.set(slot,[]);
      scheduled.get(slot).push(item);
    }
    let rows='';
    for(let hour=7;hour<=22;hour++){
      const events=scheduled.get(hour)||[];
      rows+='<div class="pr-hour-row"><span class="pr-hour-label">'+String(hour).padStart(2,'0')+':00</span>'+
      '<div class="pr-hour-content">'+(events.map(item=>{
        const x=item.row,collision=conf.conflicts.has(x.id),suggestion=collision?conf.suggest(x):null;
        return '<div class="pr-agenda-slot'+(collision?' pr-collision':'')+'"><div><b>'+escapeHtml(x.start||'19:00')+' · '+escapeHtml(x.title||'Sessão de estudo')+'</b><small>'+num(x.minutes)+' min'+(collision?' · conflito de horário':'')+'</small></div>'+
        (suggestion?action('Mover para '+suggestion,'move-agenda',x.id):'')+
        (suggestion?'<input type="hidden" class="pr-proposal" value="'+escapeHtml(suggestion)+'">':'')+
        '</div>';
      }).join('')||'')+'</div></div>';
    }
    const outside=conf.periods.filter(item=>item.start<7*60||item.start>=23*60);
    if(outside.length)rows+='<div class="pr-note">Fora da régua: '+outside.map(x=>escapeHtml((x.row.start||'19:00')+' · '+(x.row.title||'Estudo'))).join(' · ')+'</div>';
    const nav='<div class="pr-agenda-datebar"><button data-pr-agenda-day="-1" aria-label="Dia anterior">←</button><button data-pr-agenda-day="today">Hoje</button><strong>'+escapeHtml(agendaFocusDay.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}))+'</strong><button data-pr-agenda-day="+1" aria-label="Próximo dia">→</button></div>';
    const info='<div class="pr-agenda-bands">'+
       (examination.length?'<p class="pr-note">Prova: '+examination.map(x=>escapeHtml(x.course.title||'Concurso')).join(' · ')+'</p>':'')+
       (reviewRows.length?'<p class="pr-note">Revisões previstas: '+reviewRows.map(x=>escapeHtml(mapName(x.map))).join(' · ')+'</p>':'')+
       (completed.length?'<p class="pr-note">Sessões realizadas: '+completed.map(x=>escapeHtml(x.label||'Estudo')+' · '+minText(x.durationSeconds)).join(' · ')+'</p>':'')+
       (!day.length?blank('Nenhum bloco de estudo agendado para este dia. O cronograma abaixo continua disponível.'):'')+'</div>';
    node.innerHTML=header('Agenda · Cronograma','Semana de '+shortDate(start)+' a '+shortDate(new Date(end.getTime()-86400000)),
      'Horários de estudo reais; conflitos não são resolvidos sem confirmação.',
      fragment('Realizado',minText(safe(()=>StudyTime.week(),0)),'Nesta semana')+
      fragment('Planejado',String(Math.round(planned))+' min',week.length+' eventos')+
      fragment('Próxima prova',s.current?shortDate(s.current.date):'—')+
      fragment('Conflitos',String(conf.conflicts.size),'No dia selecionado'))+
      box('Régua de tempo · 07h–23h',nav+info+'<div class="pr-timeline">'+rows+'</div>')+
      '<div class="pr-note">O calendário original abaixo permanece disponível em Dia, Semana e Mês. Sugestões de horário exigem sua confirmação e respeitam os dias configurados.</div>';
  }
  function renderSettingsEditorial(){
    const node=cardContainer('settings','editorialSettings');if(!node)return;
    const session=safe(()=>StudyCloud.session(),null),online=navigator.onLine!==false,
      synced=!!session&&!state.cloudSyncError,meta=safe(()=>JSON.parse(localStorage.getItem('studyapp.cloudHealth')||'null'),null),
      goals=safe(()=>StudyDashboard.goals(),{}),last=meta?.at?new Date(meta.at).toLocaleString('pt-BR'):'Sem diagnóstico';
    const list=[['01','Conta e nuvem',session?'Conta conectada':'Sem sessão ativa','authStatus'],['02','Rotina de estudo','Meta: '+(num(goals.dailyMinutes)||'não configurada')+' min/dia','studyGoalsForm'],['03','Planejamento adaptativo','Prioridades e disponibilidade','plannerSettingsForm'],['04','Automação','Regras do planejamento','studyAutomationPanel'],['05','Backup e restauração','Cópias e restauração de dados','downloadBackupBtn'],['06','Aparelho e aplicativo',online?'Conectado à rede':'Sem conexão','appDiagnosticPanel'],['07','Administração','Operações protegidas','newCourseBtn2']];
    node.innerHTML=header('Configurações · Ficha técnica','Meus Mapas · Sistema','Os estados de nuvem e backup não são simulados. Consulte os diagnósticos reais nos controles abaixo.',
      fragment('Versão',safe(()=>APP_VERSION_LABEL,'—'))+
      fragment('Conta',session?'Conectada':'Desconectada')+
      fragment('Rede',online?'Online':'Offline')+
      fragment('Saúde da nuvem',last))+
      box('Índice de folhas',list.map(x=>'<button class="pr-index-row" data-pr-action="setting" data-pr-id="'+x[3]+'"><span class="pr-folio">'+x[0]+'</span><strong>'+escapeHtml(x[1])+'</strong><small>'+escapeHtml(x[2])+'</small><span aria-hidden="true">↗</span></button>').join(''))+
      '<p class="pr-note">Zona de risco: exclusões e restaurações continuam protegidas pelos controles e confirmações originais.</p>';
  }
  function renderActive(){
    if(typeof state==='undefined'||!document.documentElement.classList.contains('app-ready'))return;
    const view=state.view;
    try{
      if(view==='home')renderHomeEditorial();
      if(view==='courses')renderCoursesEditorial();
      if(view==='course')renderCourseEditorial();
      if(view==='maps')renderMapsEditorial();
      if(view==='simulations')renderSimulationsEditorial();
      if(view==='progress')renderProgressEditorial();
      if(view==='agenda')renderAgendaEditorial();
      if(view==='settings')renderSettingsEditorial();
    }catch(error){console.error('[Pranchas] Falha no painel editorial:',error)}
  }
  let pending=0;
  function schedule(){if(pending)return;pending=requestAnimationFrame(()=>{pending=0;renderActive()})}
  function goAction(kind,id){
    if(kind==='home'){
      const target=homeScreens.some(([key])=>key===id)?id:'hoje';
      screen=target;manualHome=true;
      if(state.view!=='home')nav('home');
    }
    else if(kind==='nav'&&typeof nav==='function')nav(id);
    else if(kind==='course'&&typeof openCourse==='function')openCourse(id);
    else if(kind==='map'&&typeof openMap==='function')Promise.resolve(openMap(id)).catch(err=>safe(()=>toast(err.message),null));
    else if(kind==='study')safe(()=>{if(typeof StudyPlanner?.showTimePlan==='function')StudyPlanner.showTimePlan(30,{focusOnStart:true});else StudyDashboard?.start?.()},null);
    else if(kind==='review'&&typeof startReviewQueue==='function')startReviewQueue();
    else if(kind==='pause')StudyDashboard?.pause?.();
    else if(kind==='resume')StudyDashboard?.resume?.();
    else if(kind==='finish'){if(window.askConfirm)askConfirm('Finalizar sessão de estudo?','O tempo registrado será mantido.',()=>StudyDashboard?.finish?.());else StudyDashboard?.finish?.()}
    else if(kind==='manage-course'&&typeof openCourseAdminFor==='function')openCourseAdminFor(id);
    else if(kind==='simulation'&&typeof openSimulation==='function')openSimulation(id);
    else if(kind==='simulation-history'&&typeof openSimulationHistory==='function')openSimulationHistory(id);
    else if(kind==='plan-sim'){
      const sim=safe(()=>simulationByKey(id),null),recommendation=sim?recommendedSimDay(sim):null;
      if(!sim||!recommendation)return safe(()=>toast('Não há dia livre confirmado para este simulado antes da prova.'),null);
      const raw=window.prompt('Escolha o horário de início em '+shortDate(new Date(recommendation.date+'T12:00:00'))+' (HH:MM). Nenhum compromisso será criado sem confirmação.','');
      if(raw==null)return;
      const hour=raw.trim();
      if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hour))return safe(()=>toast('Horário inválido. Use HH:MM.'),null);
      const start=agendaMinutes(hour),end=start+recommendation.duration;
      if(end>1440)return safe(()=>toast('A duração ultrapassa o fim do dia.'),null);
      const agendas=safe(()=>StudyDashboard.exportData().agenda,[]).filter(x=>!x.deleted&&x.date===recommendation.date);
      if(agendas.some(x=>{
        const a=agendaMinutes(x.start||'19:00'),b=a+num(x.minutes);
        return start<b&&end>a;
      }))return safe(()=>toast('Já há um evento nesse intervalo. Escolha outro horário.'),null);
      const label=(sim.code||'Simulado')+' · '+(sim.title||'Treino');
      if(agendas.some(x=>x.title===label))return safe(()=>toast('Este simulado já está agendado neste dia.'),null);
      const apply=()=>{
        StudyDashboard.addAgenda({date:recommendation.date,start:hour,kind:'simulation',title:label,minutes:recommendation.duration});
        safe(()=>toast('Simulado agendado para '+hour+'.'),null);schedule();
      };
      if(typeof askConfirm==='function')askConfirm('Agendar simulado?',label+' · '+shortDate(new Date(recommendation.date+'T12:00:00'))+', '+hour+' · '+recommendation.duration+' min. O evento será registrado na Agenda.',apply,'Agendar');
    }
    else if(kind==='goal'){
      const simulation=safe(()=>simulationByKey(id),null);
      if(!simulation)return;
      const current=safe(()=>simulationOverride(simulation)?.targetScore,null);
      const answer=window.prompt('Meta pessoal de acerto (0–100%). Não é nota de corte oficial.',current==null?'80':String(current));
      if(answer===null)return;
      const raw=answer.trim().replace(',','.');
      if(!/^(?:100(?:\.0+)?|\d{1,2}(?:\.\d+)?)$/.test(raw))return safe(()=>toast('Digite uma meta entre 0 e 100%.'),null);
      patchSimulationOverride(simulation,{targetScore:Number(raw)});
      safe(()=>touchPreferences(),null);
      schedule();
    }
    else if(kind==='exam-status'){
      const c=safe(()=>courseById(id),null);
      if(!c)return;
      const registered=!!safe(()=>readExamStatuses()[id]?.completed,false);
      const apply=()=>{setExamStatus(id,!registered);schedule();safe(()=>toast(registered?'Prova desmarcada.':'Prova marcada como realizada.'),null)};
      if(typeof askConfirm==='function')askConfirm(registered?'Desmarcar prova?':'Marcar prova realizada?',(c.title||'Concurso')+' · a informação será registrada na sua conta, sem arquivamento e sem apagar dados.',apply,'Confirmar');
    }
    else if(kind==='archive-course'){
      const c=safe(()=>cloudCourseById(id),null);if(!c)return;
      const apply=async()=>{state.adminCourseId=id;await toggleCourseArchive();schedule()};
      if(typeof askConfirm==='function')askConfirm('Reativar concurso?',(c.title||'Concurso')+' voltará à lista de cursos ativos, preservando o histórico.',apply,'Reativar');
    }
    else if(kind==='postpone-review'){
      const map=safe(()=>mapById(id),null);
      if(!map)return;
      const apply=()=>{postponeScheduledReview(map,1);schedule();safe(()=>toast('Revisão adiada por 1 dia.'),null)};
      if(typeof askConfirm==='function')askConfirm('Adiar revisão?','A próxima revisão de '+(map.title||map.code)+' será movida 1 dia. O progresso e os apontamentos serão mantidos.',apply,'Adiar');
    }
    else if(kind==='review-errors'){
      const report=[...document.querySelectorAll('#editorialSimulations .pr-sim-report')].find(el=>el.dataset.prSimKey===id);
      const details=report?.querySelector('details.pr-sim-errors');
      if(details){
        expandedSimErrors.add(id);
        details.open=true;
        details.scrollIntoView({block:'center',behavior:'smooth'});
        details.querySelector('summary')?.focus({preventScroll:true});
      }
      else if(typeof openSimulationHistory==='function')openSimulationHistory(id);
    }
    else if(kind==='move-agenda'){
      const row=StudyDashboard?.exportData?.().agenda?.find(item=>item.id===id&&!item.deleted);
      if(!row)return;
      const day=StudyDashboard.exportData().agenda.filter(x=>x.date===row.date&&!x.deleted);
      const suggested=agendaConflictData(day).suggest(row);
      if(!suggested)return safe(()=>toast('Sem faixa livre válida neste dia.'),null);
      const apply=()=>{StudyDashboard.updateAgenda(id,{start:suggested});safe(()=>toast('Sessão movida para '+suggested+'.'),null);schedule()};
      if(typeof askConfirm==='function')askConfirm('Reagendar sessão?',(row.title||'Sessão')+' será movida para '+suggested+'.',apply,'Reagendar');
      else if(window.confirm('Mover '+(row.title||'Sessão')+' para '+suggested+'?'))apply();
    }
    else if(kind==='setting'){
      const target=document.getElementById(id);
      if(target){
        for(let parent=target.parentElement;parent;parent=parent.parentElement){
          if(parent.tagName==='DETAILS')parent.open=true;
        }
        const destination=target.closest('.panel,.settings-section')||target;
        destination.scrollIntoView({block:'center',behavior:'smooth'});
        if(target.matches('button'))target.focus({preventScroll:true});
      }else safe(()=>toast('Esta configuração depende de um módulo ainda não carregado.'),null);
    }
    schedule();
  }
  // Sincroniza a expansão nativa dos detalhes com o estado da prancha.
  document.addEventListener('toggle',event=>{
    const d=event.target;
    if(!d?.matches?.('#editorialSimulations details.pr-sim-errors')||!event.isTrusted)return;
    const id=d.closest('[data-pr-sim-key]')?.dataset.prSimKey;
    if(!id)return;
    if(d.open)expandedSimErrors.add(id);else expandedSimErrors.delete(id);
  },true);
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-pr-agenda-day],[data-pr-home],[data-pr-action],[data-pr-course-layout],[data-pr-library],[data-pr-sim],[data-pr-progress]');
    if(!b)return;
    event.preventDefault();
    if(b.hasAttribute('data-pr-agenda-day')){
      const value=b.dataset.prAgendaDay;
      const date=new Date(agendaFocusDay);
      if(value==='today')agendaFocusDay=new Date();
      else{date.setDate(date.getDate()+(value==='+1'?1:-1));agendaFocusDay=date}
      schedule();
    }else if(b.hasAttribute('data-pr-home')){screen=b.dataset.prHome;manualHome=true;schedule()}
    else if(b.hasAttribute('data-pr-course-layout')){
      coursePresentation=b.dataset.prCourseLayout;
      state.mapLayout=coursePresentation==='capas'?'grid':'list';
      safe(()=>localStorage.setItem('studyapp.mapLayout',state.mapLayout),null);
      if(state.view==='course')safe(()=>renderCurrentMaps(),null);
      schedule();
    }else if(b.hasAttribute('data-pr-library')){
      libPresentation=b.dataset.prLibrary;
      if(libPresentation==='agrupado'){
        if(!state.allMapsGroup)state.allMapsGroup='category';
      }else if(state.allMapsGroup){
        state.allMapsGroup='';
      }
      safe(()=>renderAllMaps(),null);
      schedule();
    }
    else if(b.hasAttribute('data-pr-sim')){simPresentation=b.dataset.prSim;schedule()}
    else if(b.hasAttribute('data-pr-progress')){selectedProgress=b.dataset.prProgress;schedule()}
    else if(b.hasAttribute('data-pr-action'))goAction(b.dataset.prAction,b.dataset.prId);
  });
  // A atualização de uma métrica pelas funções existentes precisa atualizar também os carimbos.
  for(const key of ['renderHome','renderCoursesPage','renderCurrentMaps','renderAllMaps','renderSimulations','renderProgress','renderSettings','renderStudyAgenda']){
    const original=window[key];
    if(typeof original!=='function')continue;
    window[key]=function(){const result=original.apply(this,arguments);schedule();return result};
  }
  window.addEventListener('studyapp:navigation',schedule);
  window.addEventListener('storage',schedule);
  window.addEventListener('online',schedule);
  window.addEventListener('offline',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  const timerNode=document.getElementById('studyTimerFloat');
  if(timerNode)new MutationObserver(()=>{
    const label=document.querySelector('#editorialHome [data-pr-clock]');
    if(label&&typeof StudyDashboard!=='undefined')label.textContent=clockText(safe(()=>StudyDashboard.elapsed(),0));
  }).observe(timerNode,{subtree:true,childList:true,characterData:true});
  const observe=new MutationObserver(()=>{if(document.documentElement.classList.contains('app-ready')){schedule();observe.disconnect()}});
  observe.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  if(document.documentElement.classList.contains('app-ready'))schedule();
  window.MeusMapasPranchas={refresh:schedule,snapshot:stateData};
})();

