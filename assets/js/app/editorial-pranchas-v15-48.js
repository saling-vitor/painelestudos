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
  const shortDate=d=>d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'Sem data';
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
      .sort((a,b)=>(a.date?.getTime()??Infinity)-(b.date?.getTime()??Infinity));
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
  const getCourseMaps=(s,c)=>s.ms.filter(m=>m.courseId===c?.id);
  const cardContainer=(view,id)=>{
    const node=$('[data-view="'+view+'"]');
    if(!node)return null;
    let target=node.querySelector('#'+id);
    if(!target){target=document.createElement('div');target.id=id;target.className='pr-root';node.prepend(target)}
    return target;
  };
  let screen='hoje',manualHome=false,coursePresentation='lista',libPresentation='grade',simPresentation='lista',selectedProgress='';
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
        return '<div class="pr-course-line"><div><b>'+escapeHtml(m.code||mapName(m))+'</b><small>'+escapeHtml(safe(()=>reviewDueLabel(r),'Revisão prevista'))+' · '+p.review+' REV · '+p.difficult+' DIF</small></div>'+action('Abrir','map',mapId(m))+'</div>';
      }).join('')+action('Iniciar fila','review','', 'pr-primary'):blank('Fila em dia. Novas revisões surgem quando o agendamento existente marcar vencimento.'));
      content+=box('Próximos sete dias',(s.reviews.upcoming||[]).slice(0,20).map(r=>'<div class="pr-course-line"><span>'+escapeHtml(r.map.code||mapName(r.map))+'</span><small>'+escapeHtml(shortDate(new Date(r.schedule?.dueAt)))+'</small></div>').join('')||blank('Nenhum agendamento futuro encontrado.'));
    }else if(screen==='sessao'){
      const active=s.session,elapsed=safe(()=>StudyDashboard.elapsed(),0);
      content=header('04 · Em sessão','Cronômetro de estudo',active?'Sessão real do aplicativo. O tempo é registrado pelo cronômetro já existente.':'Nenhuma sessão ativa. Inicie pelo plano ou por um mapa.',
        fragment('Duração',minText(elapsed),'Contabilizada no cronômetro')+
        fragment('Estado',active?(active.running?'Em curso':'Pausado'):'Parado')+
        fragment('Mapa',active?.mapKey?mapName(safe(()=>mapById(active.mapKey),null)):'—'));
      content+=box('Controle da sessão',active?
        action(active.running?'Pausar':'Retomar',active.running?'pause':'resume','','pr-primary')+' '+action('Finalizar','finish','')+(active.mapKey?action('Abrir mapa','map',active.mapKey):''):
        action('Iniciar pelo plano','study','','pr-primary'));
    }else{
      const past=completed;
      content=header('05 · Encerramento de prova','Pós-prova',past.length?'Mantenha o histórico dos concursos realizados. O arquivamento não elimina mapas nem resultados.':'Ainda não há uma prova passada entre os concursos ativos.',
        fragment('Provas passadas',String(past.length),'Não arquivadas')+
        fragment('Arquivados',String(done.length),'Histórico preservado')+
        fragment('Próxima prova',exam&&daysTo(exam.date)>=0?shortDate(exam.date):'—'));
      content+=box('Conferência e arquivamento',past.length?past.map(x=>'<div class="pr-course-line"><div><strong>'+escapeHtml(x.course.title||'Concurso')+'</strong><small>Prova em '+escapeHtml(shortDate(x.date))+' · confira o gabarito oficial externamente</small></div>'+action('Gerenciar','manage-course',x.course.id)+'</div>').join(''):blank('Quando a data de uma prova passar, o concurso aparecerá aqui.'));
      content+=box('Retomar o planejamento',action('Próximo concurso','nav','courses')+' '+action('Abrir Agenda','nav','agenda'));
    }
    return tab+content;
  }
  function renderHomeEditorial(){
    const node=cardContainer('home','editorialHome');if(!node)return;
    const s=stateData();
    if(!manualHome){
      const past=s.rank.filter(x=>daysTo(x.date)<0);
      if(s.session?.running)screen='sessao';
      else if(past.length&&!s.rank.some(x=>daysTo(x.date)>=0))screen='pos';
      else screen='hoje';
    }
    node.closest('.view').dataset.editorialMode=screen;
    node.innerHTML=homeHtml(s);
  }
  function renderCoursesEditorial(){
    const node=cardContainer('courses','editorialCourses');if(!node)return;
    const s=stateData(),list=s.cs.map(c=>({c,p:totals(getCourseMaps(s,c)),date:courseDate(c)})).sort((a,b)=>(a.date?.getTime()??Infinity)-(b.date?.getTime()??Infinity));
    node.innerHTML=header('Índice · Concursos','Meus Cursos','A ordem segue a data de cada prova; os dados vêm dos concursos e mapas já cadastrados.',
      fragment('Concursos',String(s.cs.length))+
      fragment('Mapas',String(s.ms.length))+
      fragment('Cobertura total',percent(s.all),s.all.marked+' de '+s.all.total+' tópicos'))+
      box('Concursos por prioridade',list.map(row=>'<div class="pr-course-line"><div><strong>'+escapeHtml(row.c.title||'Concurso')+'</strong><small>'+escapeHtml(row.date?shortDate(row.date):'Sem data de prova')+' · '+escapeHtml(row.c.status==='archived'?'Arquivado':statusText(row.p))+'</small></div><span class="pr-line"><i style="width:'+pct(row.p)+'%"></i></span><b>'+percent(row.p)+'</b>'+action('Entrar','course',row.c.id)+'</div>').join('')||blank('Entre na conta ou crie um concurso para começar.'));
  }
  function renderCourseEditorial(){
    const node=cardContainer('course','editorialCourse');if(!node)return;
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
    const group=$('#allMapsGroup');if(group){
      const desired=libPresentation==='agrupado'?'category':'';
      if(group.value!==desired&&[...group.options].some(o=>o.value===desired)){group.value=desired;state.allMapsGroup=desired;safe(()=>renderAllMaps(),null)}
    }
  }
  function renderSimulationsEditorial(){
    const node=cardContainer('simulations','editorialSimulations');if(!node)return;
    const s=stateData(),ss=simulations(),results=ss.map(sim=>({sim,result:safe(()=>simulationResult(sim),null),attempts:safe(()=>simulationAttemptsFor(sim),[])}));
    const done=results.filter(x=>x.result),attempts=results.reduce((a,x)=>a+x.attempts.length,0);
    const current=done.slice().sort((a,b)=>Date.parse(b.result.finishedAt||0)-Date.parse(a.result.finishedAt||0))[0];
    const sw='<div class="pr-switch" role="group" aria-label="Simulados: lista ou resultado">'+[['lista','Lista'],['resultado','Resultado']].map(([key,label])=>'<button class="pr-switch-btn" data-pr-sim="'+key+'" aria-pressed="'+(simPresentation===key)+'">'+label+'</button>').join('')+'</div>';
    let body=sw+header('Simulados · Ensaio de prova','Treino e resultados','Contabilização de tentativas efetivamente registradas no sistema.',
      fragment('Disponíveis',String(ss.length))+
      fragment('Com resultado',String(done.length))+
      fragment('Tentativas',String(attempts))+
      fragment('Último resultado',current&&Number.isFinite(num(current.result.score))?escapeHtml(String(current.result.score)):'—','Conforme registro original'));
    if(simPresentation==='resultado'){
      body+=box('Histórico real',done.length?done.map(x=>{
        const r=x.result;
        return '<div class="pr-course-line"><div><strong>'+escapeHtml(x.sim.title||x.sim.code||'Simulado')+'</strong><small>'+escapeHtml(r.finishedAt?new Date(r.finishedAt).toLocaleDateString('pt-BR'):'Data indisponível')+'</small></div><b>'+escapeHtml(r.correct!=null?String(r.correct)+' acertos':'Resultado salvo')+'</b>'+action('Histórico','simulation-history',safe(()=>simulationKey(x.sim),''))+'</div>';
      }).join(''):blank('Nenhum resultado registrado. O gráfico de evolução ficará disponível após tentativas reais.'));
    }else{
      body+=box('Próximas provas e simulados',ss.length?ss.slice(0,30).map(sim=>'<div class="pr-course-line"><div><strong>'+escapeHtml(sim.code||'SIM')+' · '+escapeHtml(sim.title||'Simulado')+'</strong><small>'+escapeHtml(sim.board||'Banca não informada')+' · '+escapeHtml(safe(()=>simulationDurationLabel(sim.durationMinutes||sim.duration),''))+'</small></div>'+action('Abrir','simulation',safe(()=>simulationKey(sim),''))+'</div>').join(''):blank('Nenhum simulado disponível para os concursos cadastrados.'));
    }
    node.innerHTML=body;
  }
  const historyKey=()=>{const uid=safe(()=>StudyCloud.session()?.user?.id,'offline')||'offline';return 'studyapp.pranchaProgress.v1::'+uid};
  function recordHistory(s){
    // Sem preenchimento retroativo: cria somente a observação real do dia corrente.
    if(!s.ms.length)return;
    const key=historyKey(),rows=safe(()=>JSON.parse(localStorage.getItem(key)||'[]'),[]);
    if(!Array.isArray(rows))return;
    const today=dayKey(new Date()),entry={day:today,marked:s.all.marked,total:s.all.total,at:new Date().toISOString()};
    const pos=rows.findIndex(x=>x.day===today);
    if(pos>=0)rows[pos]=entry;else rows.push(entry);
    try{localStorage.setItem(key,JSON.stringify(rows.slice(-366)))}catch{}
  }
  function renderProgressEditorial(){
    const node=cardContainer('progress','editorialProgress');if(!node)return;
    const s=stateData();recordHistory(s);
    const cs=s.cs,choice=cs.find(c=>c.id===selectedProgress);
    const rows=choice?getCourseMaps(s,choice):s.ms,p=totals(rows),hist=safe(()=>JSON.parse(localStorage.getItem(historyKey())||'[]'),[]),actual=Array.isArray(hist)?hist:[];
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
  function renderAgendaEditorial(){
    const node=cardContainer('agenda','editorialAgenda');if(!node)return;
    const s=stateData(),today=new Date(),start=new Date(today.getFullYear(),today.getMonth(),today.getDate()-((today.getDay()+6)%7));
    const end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+7);
    const agenda=(s.dashboard.agenda||[]).filter(a=>!a.deleted&&a.date&&new Date(a.date)>=start&&new Date(a.date)<end);
    const seconds=safe(()=>StudyTime.week(),0),planned=agenda.reduce((a,row)=>a+num(row.minutes||row.durationMinutes||row.duration),0);
    node.innerHTML=header('Agenda · Cronograma','Semana de '+shortDate(start)+' a '+shortDate(new Date(end.getTime()-86400000)),
      'Dia, Semana e Mês são os três modos do calendário existente. Os compromissos não são duplicados.',
      fragment('Realizado',minText(seconds),'Nesta semana')+
      fragment('Planejado',String(Math.round(planned))+' min',agenda.length+' sessões/agendamentos')+
      fragment('Próxima prova',s.current?shortDate(s.current.date):'—')+
      fragment('Pendências',String(agenda.filter(x=>!x.done&&!x.completed).length),'Sem assumir execução'))+
      '<div class="pr-note">Para modificar sessões e horários, utilize o calendário e o painel de planejamento abaixo. Sugestões não ocupam horários automaticamente.</div>';
  }
  function renderSettingsEditorial(){
    const node=cardContainer('settings','editorialSettings');if(!node)return;
    const session=safe(()=>StudyCloud.session(),null),online=navigator.onLine!==false,
      synced=!!session&&!state.cloudSyncError,meta=safe(()=>JSON.parse(localStorage.getItem('studyapp.cloudHealth')||'null'),null),
      goals=safe(()=>StudyDashboard.goals(),{}),last=meta?.at?new Date(meta.at).toLocaleString('pt-BR'):'Sem diagnóstico';
    const list=[['01','Conta e nuvem',session?'Conta conectada':'Sem sessão ativa','accountSignedIn'],['02','Rotina de estudo','Meta: '+(num(goals.dailyMinutes)||'não configurada')+' min/dia','studyGoalSettings'],['03','Planejamento adaptativo','Prioridades e disponibilidade','studyPlannerSettings'],['04','Automação','Regras do planejamento','studyAutomationSettings'],['05','Backup e restauração','Cópias e restauração de dados','downloadBackupBtn'],['06','Aparelho e aplicativo',online?'Conectado à rede':'Sem conexão','appDiagnostic'],['07','Administração','Operações protegidas','courseManageModal']];
    node.innerHTML=header('Configurações · Ficha técnica','Meus Mapas · Sistema','Os estados de nuvem e backup não são simulados. Consulte os diagnósticos reais nos controles abaixo.',
      fragment('Versão',safe(()=>APP_VERSION_LABEL,'—'))+
      fragment('Conta',session?'Conectada':'Desconectada')+
      fragment('Rede',online?'Online':'Offline')+
      fragment('Saúde da nuvem',last))+
      box('Índice de folhas',list.map(x=>'<button class="pr-index-row" data-pr-action="setting" data-pr-id="'+x[3]+'"><span class="pr-folio">'+x[0]+'</span><strong>'+escapeHtml(x[1])+'</strong><small>'+escapeHtml(x[2])+'</small><span aria-hidden="true">↗</span></button>').join(''))+
      '<p class="pr-note">Zona de risco: exclusões e restaurações continuam protegidas pelos controles e confirmações originais.</p>';
  }
  function renderActive(){
    if(!window.state||!document.documentElement.classList.contains('app-ready'))return;
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
    if(kind==='nav'&&typeof nav==='function')nav(id);
    else if(kind==='course'&&typeof openCourse==='function')openCourse(id);
    else if(kind==='map'&&typeof openMap==='function')Promise.resolve(openMap(id)).catch(err=>safe(()=>toast(err.message),null));
    else if(kind==='study')safe(()=>StudyDashboard.start?StudyDashboard.start():StudyPlanner?.showTimePlan?.(30),null);
    else if(kind==='review'&&typeof startReviewQueue==='function')startReviewQueue();
    else if(kind==='pause')StudyDashboard?.pause?.();
    else if(kind==='resume')StudyDashboard?.resume?.();
    else if(kind==='finish'){if(window.askConfirm)askConfirm('Finalizar sessão de estudo?','O tempo registrado será mantido.',()=>StudyDashboard?.finish?.());else StudyDashboard?.finish?.()}
    else if(kind==='manage-course'&&typeof openCourseAdminFor==='function')openCourseAdminFor(id);
    else if(kind==='simulation'&&typeof openSimulation==='function')openSimulation(id);
    else if(kind==='simulation-history'&&typeof openSimulationHistory==='function')openSimulationHistory(id);
    else if(kind==='setting'){const target=document.getElementById(id);if(target&&!target.closest('[hidden]')){target.scrollIntoView({block:'center',behavior:'smooth'});if(target.matches('button'))target.focus({preventScroll:true})}else safe(()=>toast('Controle disponível na ficha técnica abaixo.'),null)}
    schedule();
  }
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-pr-home],[data-pr-action],[data-pr-course-layout],[data-pr-library],[data-pr-sim],[data-pr-progress]');
    if(!b)return;
    event.preventDefault();
    if(b.hasAttribute('data-pr-home')){screen=b.dataset.prHome;manualHome=true;schedule()}
    else if(b.hasAttribute('data-pr-course-layout')){
      coursePresentation=b.dataset.prCourseLayout;
      state.mapLayout=coursePresentation==='capas'?'grid':'list';
      safe(()=>localStorage.setItem('studyapp.mapLayout',state.mapLayout),null);
      if(state.view==='course')safe(()=>renderCurrentMaps(),null);
      schedule();
    }else if(b.hasAttribute('data-pr-library')){libPresentation=b.dataset.prLibrary;schedule()}
    else if(b.hasAttribute('data-pr-sim')){simPresentation=b.dataset.prSim;schedule()}
    else if(b.hasAttribute('data-pr-progress')){selectedProgress=b.dataset.prProgress;schedule()}
    else if(b.hasAttribute('data-pr-action'))goAction(b.dataset.prAction,b.dataset.prId);
  });
  window.addEventListener('studyapp:navigation',schedule);
  window.addEventListener('storage',schedule);
  window.addEventListener('online',schedule);
  window.addEventListener('offline',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  const observe=new MutationObserver(()=>{if(document.documentElement.classList.contains('app-ready')){schedule();observe.disconnect()}});
  observe.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  if(document.documentElement.classList.contains('app-ready'))schedule();
  window.MeusMapasPranchas={refresh:schedule,snapshot:stateData};
})();
