const baseArg=process.argv[2];
if(!baseArg){
  console.error('Usage: node scripts/verify-deployment.mjs https://foodmyway.app');
  process.exit(2);
}

const base=new URL(baseArg);
if(base.protocol!=='https:') throw new Error('Deployment verification requires HTTPS.');
const failures=[];
const passed=[];

async function checkPath(pathname,{contains,headers={}}={}){
  const url=new URL(pathname,base);
  try{
    const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(response.status>=300 && response.status<400){
      failures.push(`${pathname}: redirected to ${response.headers.get('location') || 'another page'}`);
      return;
    }
    if(!response.ok){ failures.push(`${pathname}: HTTP ${response.status}`); return; }
    const body=await response.text();
    if(contains && !body.includes(contains)){ failures.push(`${pathname}: missing ${contains}`); return; }
    for(const [name,pattern] of Object.entries(headers)){
      const value=response.headers.get(name) || '';
      if(!pattern.test(value)){ failures.push(`${pathname}: invalid ${name}`); return; }
    }
    passed.push(pathname);
  }catch(error){ failures.push(`${pathname}: ${error.message}`); }
}

await checkPath('/',{
  contains:'Food My Way',
  headers:{
    'strict-transport-security':/max-age=/i,
    'x-content-type-options':/nosniff/i,
    'content-security-policy':/frame-ancestors 'none'/i
  }
});
for(const path of [
  '/app.js',
  '/config.js',
  '/service-worker.js',
  '/site.webmanifest',
  '/privacy.html',
  '/terms.html',
  '/support.html',
  '/picky-adults.html',
  '/picky-kids.html',
  '/sensory-friendly-meals.html',
  '/easy-weeknight-meals.html',
  '/robots.txt',
  '/sitemap.xml'
]){
  await checkPath(path);
}

console.log(`Passed ${passed.length} checks: ${passed.join(', ') || 'none'}`);
if(failures.length){
  console.error(`Failed ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Deployment verified: ${base.origin}`);
