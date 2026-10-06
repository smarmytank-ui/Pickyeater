const DIGITAL_KIT_PLANS=new Set(['survival_kit','founding']);

export function hasDigitalKitAccess(state={}){
  if(state?.authenticated!==true || !Array.isArray(state.entitlements)) return false;
  return state.entitlements.some(item=>item?.status==='active' && DIGITAL_KIT_PLANS.has(item?.plan));
}

export function digitalKitPlan(entitlements=[]){
  if(!Array.isArray(entitlements)) return null;
  const active=entitlements.filter(item=>item?.status==='active' && DIGITAL_KIT_PLANS.has(item?.plan));
  return active.find(item=>item.plan==='founding')?.plan || active[0]?.plan || null;
}
