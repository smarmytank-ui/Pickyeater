import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const requiredGates=[
  'approvedOrganicVideoPublic',
  'organicSignalSatisfied',
  'liveFunnelReverified',
  'metaPageReconciled',
  'tiktokContractActive',
  'destinationUrlsReverified',
  'ownerReviewedFinalScreens'
];

export async function verifySocialAdTest({projectRoot=root}={}){
  const [plan,assets]=await Promise.all([
    readFile(path.join(projectRoot,'SOCIAL_AD_TEST_MANIFEST.json'),'utf8').then(JSON.parse),
    readFile(path.join(projectRoot,'SOCIAL_ASSET_MANIFEST.json'),'utf8').then(JSON.parse)
  ]);
  const errors=[];
  const platforms=Object.values(plan.platforms||{});
  const combined=platforms.reduce((sum,item)=>sum+Number(item.maximumUsd||0),0);

  if(plan.launchAuthorized!==false) errors.push('launchAuthorized must remain false before final owner approval');
  if(plan.paymentMethodsApproved!==false) errors.push('paymentMethodsApproved must remain false before owner approval');
  if(plan.startDate!==null||plan.endDate!==null) errors.push('campaign dates must remain unset before owner review');
  if(plan.durationDays!==3) errors.push('durationDays must equal 3');
  if(combined!==plan.combinedMaximumUsd||combined>135) errors.push('combined scheduled maximum must equal and not exceed $135');
  for(const [name,item] of Object.entries(plan.platforms||{})){
    if(item.dailyBudgetUsd*plan.durationDays!==item.maximumUsd){
      errors.push(`${name}: daily budget times duration must equal the platform maximum`);
    }
    if(item.paymentMethodApproved!==false||item.publishApproved!==false){
      errors.push(`${name}: payment and publication approval must remain false`);
    }
    if(item.automaticExpansion!==false) errors.push(`${name}: automatic expansion must remain off`);
  }
  if(plan.platforms?.tiktok?.promotionalRebateAccepted!==false){
    errors.push('TikTok promotional rebate must remain declined');
  }
  for(const [name,enabled] of Object.entries(plan.tracking||{})){
    if(enabled!==false) errors.push(`tracking.${name} must remain false for test one`);
  }
  for(const gate of requiredGates){
    if(plan.gates?.[gate]!==false) errors.push(`gates.${gate} must remain false until directly verified`);
  }
  const approvedAssets=new Map((assets.assets||[]).map(item=>[item.creativeCode,item.file]));
  if(!Array.isArray(plan.creatives)||plan.creatives.length!==3) errors.push('exactly three creatives are required');
  for(const creative of plan.creatives||[]){
    if(approvedAssets.get(creative.code)!==creative.asset){
      errors.push(`${creative.code}: creative must match the narrated asset allowlist`);
    }
  }
  if(errors.length) throw new Error(`Social ad-test verification failed:\n- ${errors.join('\n- ')}`);
  return {platforms:platforms.length,creatives:plan.creatives.length,combinedMaximumUsd:combined,launchAuthorized:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  verifySocialAdTest()
    .then(result=>console.log(`Verified ${result.platforms} platform plans and ${result.creatives} creatives; $${result.combinedMaximumUsd} maximum; launch disabled.`))
    .catch(error=>{
      console.error(error.message);
      process.exitCode=1;
    });
}
