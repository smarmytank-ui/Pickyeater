import test from 'node:test';
import assert from 'node:assert/strict';
import { hasDigitalKitAccess } from '../functions/_shared/survival-kit-access.mjs';

const entitlement=(plan,status='active')=>({plan,status});

test('active Survival Kit and Founding entitlements unlock the digital kit',()=>{
  assert.equal(hasDigitalKitAccess({authenticated:true,entitlements:[entitlement('survival_kit')]}),true);
  assert.equal(hasDigitalKitAccess({authenticated:true,entitlements:[entitlement('founding')]}),true);
});

test('anonymous and signed-in free accounts remain locked',()=>{
  assert.equal(hasDigitalKitAccess({authenticated:false,entitlements:[entitlement('founding')]}),false);
  assert.equal(hasDigitalKitAccess({authenticated:true,entitlements:[]}),false);
});

test('refunded entitlements do not unlock the digital kit',()=>{
  assert.equal(hasDigitalKitAccess({authenticated:true,entitlements:[entitlement('survival_kit','refunded')]}),false);
  assert.equal(hasDigitalKitAccess({authenticated:true,entitlements:[entitlement('founding','refunded')]}),false);
});

test('unrelated plans and malformed session data do not unlock the digital kit',()=>{
  assert.equal(hasDigitalKitAccess({authenticated:true,entitlements:[entitlement('other_plan')]}),false);
  assert.equal(hasDigitalKitAccess(null),false);
});
