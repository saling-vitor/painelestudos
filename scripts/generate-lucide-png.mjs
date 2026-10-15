import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/* Icons are official Lucide geometry rasterized into PNG alpha. SVGs exist only at build time. */
const icons={
 'home':'house','courses':'library-big','maps':'book-open','book-open':'book-open',
 'simulations':'clipboard-check','progress':'chart-no-axes-column','settings':'settings',
 'search':'search','download':'download','upload':'upload','sync':'refresh-cw',
 'plus':'plus','chevron-right':'chevron-right','chevron-left':'chevron-left',
 'chevron-down':'chevron-down','document':'file-text','star':'star',
 'grid':'layout-grid','list':'list','close':'x','trash':'trash-2',
 'archive':'archive','admin':'shield-check','cloud':'cloud',
 'cloud-check':'cloud-check','cloud-upload':'cloud-upload','cloud-off':'cloud-off',
 'cloud-alert':'cloud-alert','user':'user-round','warning':'triangle-alert',
 'success':'circle-check','calendar':'calendar-days','more':'ellipsis',
 'device':'monitor-smartphone','bolt':'zap','target':'target',
 'chart-bars':'chart-no-axes-column','clock':'clock','play':'play',
 'pause':'pause','stop':'square','focus':'scan','help':'circle-help',
 'question':'circle-help','repeat':'repeat','file-down':'file-down',
 'notebook-pen':'notebook-pen'
};
const outDir=path.resolve('assets/ui-icons/lucide');
await fs.mkdir(outDir,{recursive:true});
for(const [filename,source] of Object.entries(icons)){
 const sourceFile=path.resolve('node_modules/lucide-static/icons',source+'.svg');
 const svg=await fs.readFile(sourceFile,'utf8');
 const png=await sharp(Buffer.from(svg)).resize(96,96,{fit:'contain'}).png({compressionLevel:9}).toBuffer();
 await fs.writeFile(path.join(outDir,filename+'.png'),png);
 console.log('✓',filename+'.png','←',source+'.svg',png.length,'bytes');
}
const license='Lucide Icons (https://lucide.dev)\nCopyright (c) 2026 Lucide Icons and Contributors.\nLucide uses ISC and Feather-derived MIT licenses. See https://lucide.dev/license\nRendered original Lucide drawings to PNG for MEUS MAPAS; website UI loads only PNG files.\n';
await fs.writeFile(path.join(outDir,'SOURCE-LICENSE.txt'),license);
console.log('✓ '+Object.keys(icons).length+' PNGs gerados');