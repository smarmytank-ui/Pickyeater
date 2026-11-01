import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
export function buildRetentionWorker(root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')){
 const helper=fs.readFileSync(path.join(root,'functions/_shared/ad-retention.mjs'),'utf8').replace(/^\uFEFF/,'').replace(/\r/g,'').replace(/^export /gm,''),worker=fs.readFileSync(path.join(root,'operations/ad-retention-worker.mjs'),'utf8').replace(/\r/g,'').replace(/^import \{redactMeasurementDetails\} from '\.\.\/functions\/_shared\/ad-retention\.mjs';\r?\n/,'');
 if(/^import /m.test(worker)||/^import /m.test(helper))throw Error('Unexpected external import');
 return '// Generated local retention bundle: no dependencies or credentials.\n'+helper+'\n'+worker;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--emit')throw Error('Only explicit --emit writes the local bundle');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir=path.join(root,'output');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'ad-retention-worker.mjs'),buildRetentionWorker(root));
 console.log('Local bundle ready: output/ad-retention-worker.mjs (not deployed)');
}
