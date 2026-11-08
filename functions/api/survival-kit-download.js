import {createKitDownloadHandler} from '../_shared/survival-kit-download.mjs';

export const onRequestGet=createKitDownloadHandler();
export function onRequestPost(){
  return new Response(JSON.stringify({error:'Method not allowed.'}),{status:405,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
