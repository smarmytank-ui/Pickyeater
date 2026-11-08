// Product authoring sources are not public assets. Paid content is served only
// through the authenticated digital-kit and survival-kit-download API routes.
export function onRequest(){
  return new Response('Not found.', {status:404,headers:{
    'content-type':'text/plain; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  }});
}
