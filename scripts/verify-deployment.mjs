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
let commerceLaunchEnabled=false;

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

async function checkLaunchCopy(pathname,{contains=[],excludes=[]}){
  try{
    const response=await fetch(new URL(pathname,base),{signal:AbortSignal.timeout(15000)});
    if(!response.ok){ failures.push(`${pathname} launch copy: HTTP ${response.status}`); return; }
    const body=await response.text();
    for(const value of contains){
      if(!body.toLowerCase().includes(value.toLowerCase())) failures.push(`${pathname}: paid-launch copy is missing ${value}`);
      else passed.push(`${pathname} copy: ${value}`);
    }
    for(const value of excludes){
      if(body.toLowerCase().includes(value.toLowerCase())) failures.push(`${pathname}: paid-launch copy still contains ${value}`);
      else passed.push(`${pathname} excludes: ${value}`);
    }
    if(body.includes('[[')) failures.push(`${pathname}: unresolved legal placeholder`);
  }catch(error){ failures.push(`${pathname} launch copy: ${error.message}`); }
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
  '/privacy',
  '/terms',
  '/support',
  '/404',
  '/picky-adults',
  '/picky-kids',
  '/sensory-friendly-meals',
  '/easy-weeknight-meals',
  '/robots.txt',
  '/sitemap.xml'
]){
  await checkPath(path);
}
await checkApi('/food-my-way-verifier-missing-page',{statuses:[404],contains:'Food My Way'});

if(launchMode){
  try{
    const response=await fetch(new URL('/config.js',base),{signal:AbortSignal.timeout(15000)});
    const config=await response.text();
    commerceLaunchEnabled=/commerceEnabled:\s*true/.test(config);
    const requiredFlags=['accountsEnabled','premiumEnforced','telemetryEnabled'];
    for(const flag of requiredFlags){
      if(!new RegExp(`${flag}:\\s*true`).test(config)) failures.push(`/config.js: ${flag} must be true for paid launch`);
      else passed.push(`/config.js ${flag}`);
    }
    if(!/founderCheckoutUrl:\s*['"]https:\/\/(?:buy\.stripe\.com|checkout\.stripe\.com)\//.test(config)){
      failures.push('/config.js: a valid Stripe founderCheckoutUrl is required for paid launch');
    }else passed.push('/config.js founderCheckoutUrl');
  }catch(error){ failures.push(`/config.js launch settings: ${error.message}`); }
  await checkLaunchCopy('/',{
    contains:['First 250 paid members','$29'],
    excludes:['private beta is free while we finish accounts and payments']
  });
  await checkLaunchCopy('/terms.html',{
    contains:['Food My Way Founding Member','14 calendar days','$29'],
    excludes:['These terms cover the Food My Way private beta','must be finalized before checkout opens']
  });
  await checkLaunchCopy('/privacy.html',{
    contains:['Cloudflare','Resend','Stripe','90 days'],
    excludes:['before their material data collection is enabled']
  });
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
await checkApi('/api/recipe-import',{statuses:[405],headers:jsonNoStore});
await checkApi('/api/recipe-import',{
  method:'POST',body:'{"url":"http://localhost/recipe"}',requestHeaders:{'content-type':'application/json'},
  statuses:[400],headers:jsonNoStore
});
await checkApi('/api/shop',{
  method:'POST',body:'{"items":[]}',requestHeaders:{'content-type':'application/json'},
  statuses:launchMode && commerceLaunchEnabled ? [401] : launchMode ? [401,503] : [400,401,503],headers:jsonNoStore
});

console.log(`Passed ${passed.length} checks: ${passed.join(', ') || 'none'}`);
if(failures.length){
  console.error(`Failed ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`${launchMode ? 'Paid-launch' : 'Core deployment'} verified: ${base.origin}`);
