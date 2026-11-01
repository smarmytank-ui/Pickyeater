import {redactMeasurementDetails} from '../functions/_shared/ad-retention.mjs';
export const RETENTION_REVISION='retention-v2-consent-delete-20261101';
export const RETENTION_CRON='*/15 * * * *';
// Recorded local binding; owner must verify the ACTUAL remote binding at release.
export const EXPECTED_DATABASE_ID='fe02092f-41c3-4ac4-b4b5-2b5e8c22fc23';
export async function runRetentionOnce(env){
 if(env?.FMW_AD_RETENTION_ENABLED!=='true')return {state:'disabled',mutated:false};
 if(env.FMW_AD_RETENTION_APPROVED_REVISION!==RETENTION_REVISION||env.FMW_AD_RETENTION_EXPECTED_DATABASE_ID!==EXPECTED_DATABASE_ID||typeof env.PURCHASES?.prepare!=='function'||typeof env.PURCHASES?.batch!=='function')throw Error('Retention configuration not approved');
 const result=await redactMeasurementDetails({db:env.PURCHASES});
 return {state:'completed',revision:RETENTION_REVISION,...result};
}
export default {
 // No maintenance URL, credential, request data or caller-selected cutoff.
 async fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});},
 async scheduled(controller,env){
  try{if(controller.cron!==RETENTION_CRON)throw Error('Unapproved schedule');
   const receipt=await runRetentionOnce(env);console.log(JSON.stringify({operation:'ad-retention',...receipt}));return receipt;
  }catch{controller.noRetry?.();console.error('ad-retention failed; no details logged');throw Error('Ad retention failed; inspect approved configuration and platform event');}
 }
};
