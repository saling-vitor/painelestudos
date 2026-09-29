import fs from 'node:fs';

const app=fs.readFileSync('assets/js/app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
let failed=false;
function check(condition,message){if(condition)console.log('✓ '+message);else{failed=true;console.error('✖ '+message)}}

for(const fn of ['parseRoute','routeForView','restoreRouteFromLocation'])check(app.includes(`function ${fn}`),fn+' existe');
for(const view of ['home','courses','maps','simulations','progress','settings'])check(index.includes(`data-nav="${view}"`)||index.includes(`data-view="${view}"`),'rota estática '+view);
check(app.includes("if(view==='course')")&&index.includes('data-view="course"'),'rota course');
check(app.includes("if(view==='map')")&&app.includes("#map/"),'rota map');
check(app.includes("if(view==='simulation')")&&app.includes("#simulation/"),'rota simulation');
check(app.includes('popstate'),'Back/Forward listener');
if(failed){console.error('\nSMOKE ESTÁTICO FALHOU.');process.exit(1)}
console.log('\n✓ Smoke estático de rotas aprovado.')
