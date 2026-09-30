const ALLOWED_EVENTS=new Set([
  'page_view','client_error','beta_data_exported','weekly_plan_toggled','grocery_item_checked',
  'weekly_planner_opened','saved_recipe_opened','recipe_book_opened','recipe_shared','recipe_generated','recipe_imported',
  'recipe_saved','recipe_intent_recorded','founder_checkout_started','founder_checkout_returned','founder_interest_opened',
  'kit_page_viewed','kit_checkout_started','kit_downloaded','kit_app_clicked',
  'founder_interest_saved','founder_interest_synced','taste_profile_opened','taste_profile_saved','local_data_deleted',
  'install_prompt_result','app_installed','premium_gate_viewed','grocery_shop_started',
  'grocery_shop_link_created','grocery_shop_failed','account_sign_in_requested',
  'account_signed_in','cloud_backup_completed','storage_write_failed','shared_recipe_invalid'
]);

const NUMBER_KEYS=new Set(['ingredient_count','saved_count','plan_size','avoid_count','price','item_count']);
const BOOLEAN_KEYS=new Set(['planned','checked','synced','founding']);
const STRING_VALUES={
  currency:new Set(['USD']),
  outcome:new Set(['accepted','dismissed']),
  result:new Set(['success','cancel']),
  source:new Set(['runtime','promise']),
  feature:new Set(['weekly_planning','household_profile','unlimited_saves','grocery_checkout']),
  campaign_source:new Set(['tiktok','instagram','facebook','organic','unknown']),
  campaign_creative:new Set(['four_safe_foods','taco_swap','picky_adults','unknown'])
};

export function normalizeTelemetryEvent(input){
  const event=String(input?.event || '');
  if(!ALLOWED_EVENTS.has(event)) throw new Error('Unknown telemetry event.');
  const sessionId=String(input?.sessionId || '');
  if(!/^[a-f0-9-]{20,64}$/i.test(sessionId)) throw new Error('Invalid telemetry session.');
  const path=String(input?.path || '/').split(/[?#]/,1)[0].slice(0,120) || '/';
  if(!path.startsWith('/')) throw new Error('Invalid telemetry path.');
  const details={};
  for(const [key,value] of Object.entries(input?.details || {})){
    if(NUMBER_KEYS.has(key) && Number.isFinite(value)) details[key]=Math.max(0,Math.min(10000,Number(value)));
    else if(BOOLEAN_KEYS.has(key) && typeof value==='boolean') details[key]=value;
    else if(STRING_VALUES[key]?.has(value)) details[key]=value;
  }
  return {event,sessionId,path,details};
}
