import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const socialTest='test/social-assets.test.mjs';
async function findTests(directory){
  const entries=await readdir(path.join(root,directory),{withFileTypes:true});
  const files=await Promise.all(entries.map(entry=>{
    const relative=path.posix.join(directory,entry.name);
    if(entry.isDirectory())return ['.git','node_modules','output','tmp'].includes(entry.name) ? [] : findTests(relative);
    const executable=/\.(?:js|mjs|cjs)$/.test(entry.name);
    const inTestDirectory=relative.split('/').slice(0,-1).includes('test');
    const testName=/^(?:test[.-])|[.-]test(?:[.-]|$)/.test(entry.name);
    return executable && (inTestDirectory || testName) ? [relative] : [];
  }));
  return files.flat();
}
const tests=(await findTests('')).sort();
if(!tests.includes(socialTest))throw new Error('Expected unchanged social readiness test is missing.');
const appTests=tests.filter(file=>file!==socialTest);
if(!appTests.length)throw new Error('No app tests found.');
if(process.argv.includes('--list'))console.log(JSON.stringify({appTests,socialTests:[socialTest]}));
else {
  const result=spawnSync(process.execPath,['--test',...appTests],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  process.exitCode=result.status ?? 1;
}
