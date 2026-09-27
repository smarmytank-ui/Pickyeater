const baseArg=process.argv[2];
if(!baseArg){
  console.error('Usage: node scripts/verify-deployment.mjs https://foodmyway.app [--launch]');
  process.exit(2);
}
const launchMode=process.argv.includes('--launch');

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

async function checkApi(pathname,{method='GET',body,requestHeaders={},statuses=[200],contains,location,headers={}}={}){
  const url=new URL(pathname,base);
  try{
    const response=await fetch(url,{method,body,headers:requestHeaders,redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(!statuses.includes(response.status)){
      failures.push(`${method} ${pathname}: HTTP ${response.status}; expected ${statuses.join(' or ')}`);
      return;
    }
    if(location && !location.test(response.headers.get('location') || '')){
      failures.push(`${method} ${pathname}: invalid redirect target`);
      return;
    }
    const responseBody=await response.text();
    if(contains && !responseBody.includes(contains)){
      failures.push(`${method} ${pathname}: missing ${contains}`);
      return;
    }
    for(const [name,pattern] of Object.entries(headers)){
      const value=response.headers.get(name) || '';
      if(!pattern.test(value)){
        failures.push(`${method} ${pathname}: invalid ${name}`);
        return;
      }
    }
    passed.push(`${method} ${pathname}`);
  }catch(error){ failures.push(`${method} ${pathname}: ${error.message}`); }
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

if(launchMode){
  try{
    const response=await fetch(new URL('/config.js',base),{signal:AbortSignal.timeout(15000)});
    const config=await response.text();
    const requiredFlags=['accountsEnabled','premiumEnforced','telemetryEnabled'];
    for(const flag of requiredFlags){
      if(!new RegExp(`${flag}:\\s*true`).test(config)) failures.push(`/config.js: ${flag} must be true for paid launch`);
      else passed.push(`/config.js ${flag}`);
    }
    if(!/founderCheckoutUrl:\s*['"]https:\/\/(?:buy\.stripe\.com|checkout\.stripe\.com)\//.test(config)){
      failures.push('/config.js: a valid Stripe founderCheckoutUrl is required for paid launch');
    }else passed.push('/config.js founderCheckoutUrl');
  }catch(error){ failures.push(`/config.js launch settings: ${error.message}`); }
}

const noStore={'cache-control':/no-store/i};
const jsonNoStore={'content-type':/application\/json/i,...noStore};
await checkApi('/api/auth/session',{contains:'"authenticated":',headers:jsonNoStore});
await checkApi('/api/auth/consume?token=invalid',{
  statuses:[302],location:launchMode ? /[?&]login=invalid(?:&|$)/ : /[?&]login=(?:invalid|unavailable)(?:&|$)/,headers:noStore
});
await checkApi('/api/stripe-webhook',{statuses:[405],headers:jsonNoStore});
await checkApi('/api/stripe-webhook',{
  method:'POST',body:'{}',requestHeaders:{'content-type':'application/json','stripe-signature':'invalid'},
  statuses:launchMode ? [400] : [400,503],headers:jsonNoStore
});
await checkApi('/api/auth/request',{
  method:'POST',body:'{"email":"invalid"}',requestHeaders:{'content-type':'application/json'},
  statuses:launchMode ? [400] : [400,503],headers:jsonNoStore
});
await checkApi('/api/founding-interest',{
  method:'POST',body:'{"email":"invalid","consent":false}',requestHeaders:{'content-type':'application/json'},
  statuses:launchMode ? [400] : [400,503],headers:jsonNoStore
});
await checkApi('/api/founding-unsubscribe?token=invalid',{
  statuses:launchMode ? [400] : [400,503],headers:{'content-type':/text\/html/i,...noStore}
});
await checkApi('/api/account/data',{
  statuses:launchMode ? [401] : [401,503],headers:jsonNoStore
});
await checkApi('/api/events',{
  method:'POST',body:'{}',requestHeaders:{'content-type':'application/json'},
  statuses:launchMode ? [400] : [400,503],headers:jsonNoStore
});
await checkApi('/api/shop',{
  method:'POST',body:'{"items":[]}',requestHeaders:{'content-type':'application/json'},
  statuses:[400,503],headers:jsonNoStore
});

console.log(`Passed ${passed.length} checks: ${passed.join(', ') || 'none'}`);
if(failures.length){
  console.error(`Failed ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`${launchMode ? 'Paid-launch' : 'Core deployment'} verified: ${base.origin}`);
