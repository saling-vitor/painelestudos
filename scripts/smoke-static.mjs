import fs from 'node:fs';

const moduleFiles=["assets/js/app/state.js","assets/js/app/core.js","assets/js/app/study-time.js","assets/js/app/router.js","assets/js/app/maps.js","assets/js/app/courses.js","assets/js/app/search.js","assets/js/app/progress.js","assets/js/app/reader.js","assets/js/app/sync.js","assets/js/app/diagnostics.js","assets/js/app/backup.js","assets/js/app/ui.js","assets/js/app/simulations.js","assets/js/app/updates.js"];
const app=[...moduleFiles.map(file=>fs.readFileSync(file,'utf8')),fs.readFileSync('assets/js/app.js','utf8')].join('\n');
const index=fs.readFileSync('index.html','utf8');
let failed=false;
function check(condition,message){if(condition)console.log('✓ '+message);else{failed=true;console.error('✖ '+message)}}

for(const file of moduleFiles)check(index.includes(file),'módulo '+file);check(index.includes('assets/js/app.js'),'bootstrap app.js');
for(const fn of ['parseRoute','routeForView','restoreRouteFromLocation'])check(app.includes(`function ${fn}`),fn+' existe');
for(const view of ['home','courses','maps','simulations','progress','settings'])check(index.includes(`data-nav="${view}"`)||index.includes(`data-view="${view}"`),'rota estática '+view);
check(app.includes("if(view==='course')")&&index.includes('data-view="course"'),'rota course');
check(app.includes("if(view==='map')")&&app.includes("#map/"),'rota map');
check(app.includes("if(view==='simulation')")&&app.includes("#simulation/"),'rota simulation');
check(app.includes('popstate'),'Back/Forward listener');
if(failed){console.error('\nSMOKE ESTÁTICO FALHOU.');process.exit(1)}
console.log('\n✓ Smoke estático de rotas aprovado.')
