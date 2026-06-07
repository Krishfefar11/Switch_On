/**
 * SwitchOn SDK — self-contained unit tests
 * Runs without a live server by mocking fetch.
 * Run: node test/sdk.test.js
 */

'use strict';

var assert = require('assert');
var crypto = require('crypto');

// ── Test harness ──────────────────────────────────────────────────────────────
var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ✓', name);
    passed++;
  } catch (e) {
    console.error('  ✗', name);
    console.error('    ', e.message);
    failed++;
  }
}

function eq(a, b, msg) {
  assert.deepStrictEqual(a, b, msg || ('Expected ' + JSON.stringify(a) + ' to equal ' + JSON.stringify(b)));
}

// ── Import Node SDK evaluation engine ─────────────────────────────────────────
var nodeModule = require('../src/node.js');
var evaluate   = nodeModule.evaluate;
var getBucket  = nodeModule.getBucket;

// ── Mock a minimal flag document ──────────────────────────────────────────────
function makeFlag(overrides) {
  return Object.assign({
    name:              'test-flag',
    type:              'boolean',
    enabled:           true,
    rolloutPercentage: 100,
    rules:             [],
    variations:        [],
    defaultVariation:  0,
  }, overrides);
}

// ── Bucketing tests ───────────────────────────────────────────────────────────
console.log('\nBucketing:');

test('getBucket returns a number between 0 and 100', function () {
  var b = getBucket('my-flag', 'user-123');
  assert.ok(b >= 0 && b <= 100, 'bucket out of range: ' + b);
});

test('getBucket is deterministic — same inputs always produce the same bucket', function () {
  var b1 = getBucket('dark-mode', 'user-abc');
  var b2 = getBucket('dark-mode', 'user-abc');
  eq(b1, b2);
});

test('getBucket produces different values for different users', function () {
  var b1 = getBucket('dark-mode', 'user-1');
  var b2 = getBucket('dark-mode', 'user-9999');
  assert.notStrictEqual(b1, b2, 'Different users should get different buckets');
});

test('getBucket produces different values for different flag names', function () {
  var b1 = getBucket('flag-a', 'user-1');
  var b2 = getBucket('flag-b', 'user-1');
  assert.notStrictEqual(b1, b2, 'Different flags should produce different buckets');
});

test('getBucket matches MD5 algorithm used by the server', function () {
  var flagName = 'checkout-v2';
  var userId   = 'user-42';
  var hash     = crypto.createHash('md5').update(flagName + ':' + userId).digest('hex');
  var hashInt  = parseInt(hash.substring(0, 8), 16);
  var expected = (hashInt / 0xFFFFFFFF) * 100;
  var actual   = getBucket(flagName, userId);
  eq(parseFloat(actual.toFixed(6)), parseFloat(expected.toFixed(6)));
});

// ── Evaluation engine tests ───────────────────────────────────────────────────
console.log('\nEvaluation engine:');

test('FLAG_DISABLED: disabled flag always returns enabled=false', function () {
  var flag   = makeFlag({ enabled: false });
  var result = evaluate(flag, 'user-1');
  eq(result.enabled, false);
  eq(result.reason,  'FLAG_DISABLED');
});

test('FULL_ROLLOUT: 100% rollout returns enabled=true for everyone', function () {
  var flag = makeFlag({ rolloutPercentage: 100 });
  ['user-a', 'user-b', 'user-c', 'user-xyz', 'user-999'].forEach(function (uid) {
    var result = evaluate(flag, uid);
    eq(result.enabled, true, 'Expected enabled for ' + uid);
    eq(result.reason, 'FULL_ROLLOUT');
  });
});

test('ZERO_ROLLOUT: 0% rollout returns enabled=false for everyone', function () {
  var flag = makeFlag({ rolloutPercentage: 0 });
  ['user-a', 'user-b', 'user-c'].forEach(function (uid) {
    var result = evaluate(flag, uid);
    eq(result.enabled, false, 'Expected disabled for ' + uid);
    eq(result.reason, 'ZERO_ROLLOUT');
  });
});

test('PERCENTAGE: rollout consistency — user always gets the same result', function () {
  var flag = makeFlag({ rolloutPercentage: 50 });
  var uid  = 'user-stable-123';
  var r1   = evaluate(flag, uid);
  var r2   = evaluate(flag, uid);
  eq(r1.enabled, r2.enabled);
  eq(r1.bucket,  r2.bucket);
});

test('PERCENTAGE: bucket controls in/out of rollout', function () {
  // Force a known bucket by using a flag+user combo we pre-computed
  var flag   = makeFlag({ rolloutPercentage: 50 });
  var result = evaluate(flag, 'user-1');
  var bucket = getBucket('test-flag', 'user-1');
  eq(result.enabled, bucket < 50);
});

test('RULE_MATCH: targeting rule matching attribute equals', function () {
  var flag = makeFlag({
    rolloutPercentage: 0,   // default: no one gets it
    rules: [{
      description: 'Paid users',
      conditions:  [{ attribute: 'plan', operator: 'equals', value: 'pro' }],
      serve:       0,
      rollout:     100,
    }],
  });
  var proResult  = evaluate(flag, 'user-1', { plan: 'pro' });
  var freeResult = evaluate(flag, 'user-2', { plan: 'free' });
  eq(proResult.enabled,  true,  'pro user should get the flag');
  eq(proResult.reason,   'RULE_MATCH');
  eq(freeResult.enabled, false, 'free user should not get the flag');
});

test('RULE_MATCH: targeting rule matching attribute contains', function () {
  var flag = makeFlag({
    rolloutPercentage: 0,
    rules: [{
      description: 'Gmail users',
      conditions:  [{ attribute: 'email', operator: 'contains', value: '@gmail.com' }],
      serve:       0,
      rollout:     100,
    }],
  });
  var r1 = evaluate(flag, 'u1', { email: 'user@gmail.com' });
  var r2 = evaluate(flag, 'u2', { email: 'user@work.com' });
  eq(r1.enabled, true);
  eq(r2.enabled, false);
});

test('RULE_MATCH: multiple conditions (AND logic)', function () {
  var flag = makeFlag({
    rolloutPercentage: 0,
    rules: [{
      conditions: [
        { attribute: 'plan',    operator: 'equals', value: 'pro'  },
        { attribute: 'country', operator: 'equals', value: 'IN'   },
      ],
      serve:   0,
      rollout: 100,
    }],
  });
  var r1 = evaluate(flag, 'u1', { plan: 'pro', country: 'IN' });   // both match
  var r2 = evaluate(flag, 'u2', { plan: 'pro', country: 'US' });   // second fails
  var r3 = evaluate(flag, 'u3', { plan: 'free', country: 'IN' });  // first fails
  eq(r1.enabled, true);
  eq(r2.enabled, false);
  eq(r3.enabled, false);
});

test('RULE_MATCH: in operator', function () {
  var flag = makeFlag({
    rolloutPercentage: 0,
    rules: [{
      conditions: [{ attribute: 'plan', operator: 'in', value: ['pro', 'enterprise'] }],
      serve:   0,
      rollout: 100,
    }],
  });
  eq(evaluate(flag, 'u1', { plan: 'pro' }).enabled,        true);
  eq(evaluate(flag, 'u2', { plan: 'enterprise' }).enabled,  true);
  eq(evaluate(flag, 'u3', { plan: 'free' }).enabled,        false);
});

test('RULE_MATCH: greaterThan operator', function () {
  var flag = makeFlag({
    rolloutPercentage: 0,
    rules: [{
      conditions: [{ attribute: 'age', operator: 'greaterThan', value: 18 }],
      serve:   0,
      rollout: 100,
    }],
  });
  eq(evaluate(flag, 'u1', { age: 25 }).enabled, true);
  eq(evaluate(flag, 'u2', { age: 16 }).enabled, false);
});

test('RULE_MATCH: missing attribute returns false (no crash)', function () {
  var flag = makeFlag({
    rolloutPercentage: 0,
    rules: [{
      conditions: [{ attribute: 'plan', operator: 'equals', value: 'pro' }],
      serve: 0, rollout: 100,
    }],
  });
  var r = evaluate(flag, 'u1', {});  // no attributes at all
  eq(r.enabled, false);
});

test('Multivariate string flag returns correct variation value', function () {
  var flag = makeFlag({
    type: 'string',
    rolloutPercentage: 100,
    variations:       [{ name: 'Control', value: 'Buy Now' }, { name: 'Test', value: 'Get Started' }],
    defaultVariation: 1,
  });
  var r = evaluate(flag, 'user-1');
  eq(r.value,   'Get Started');
  eq(r.enabled, true);
});

test('Multivariate flag rule serves specific variation', function () {
  var flag = makeFlag({
    type: 'string',
    rolloutPercentage: 0,
    variations: [{ name: 'A', value: 'alpha' }, { name: 'B', value: 'beta' }],
    defaultVariation: 0,
    rules: [{
      conditions: [{ attribute: 'plan', operator: 'equals', value: 'pro' }],
      serve:   1,   // serve variation index 1 = 'beta'
      rollout: 100,
    }],
  });
  var r = evaluate(flag, 'u1', { plan: 'pro' });
  eq(r.value, 'beta');
  eq(r.reason, 'RULE_MATCH');
});

// ── SwitchOnServer unit tests (without live server) ───────────────────────────
console.log('\nSwitchOnServer class:');

test('Constructor throws if apiUrl missing', function () {
  assert.throws(function () {
    new nodeModule({ sdkKey: 'x' });
  });
});

test('Constructor throws if sdkKey missing', function () {
  assert.throws(function () {
    new nodeModule({ apiUrl: 'http://localhost:3001' });
  });
});

test('variation returns defaultValue before init', function () {
  var client = new nodeModule({ apiUrl: 'http://localhost:3001', sdkKey: 'x' });
  eq(client.variation('any-flag', 'u1', {}, 'fallback'), 'fallback');
});

test('isEnabled returns false before init', function () {
  var client = new nodeModule({ apiUrl: 'http://localhost:3001', sdkKey: 'x' });
  eq(client.isEnabled('any-flag', 'u1'), false);
});

test('evaluateAll returns empty object before init', function () {
  var client = new nodeModule({ apiUrl: 'http://localhost:3001', sdkKey: 'x' });
  eq(client.evaluateAll('u1'), {});
});

test('flagNames returns empty array before init', function () {
  var client = new nodeModule({ apiUrl: 'http://localhost:3001', sdkKey: 'x' });
  eq(client.flagNames(), []);
});

test('variation works correctly when flags are loaded manually', function () {
  var client = new nodeModule({ apiUrl: 'http://localhost:3001', sdkKey: 'x' });
  // Manually inject flag data (simulates what _fetchFlags does)
  client._flags = {
    'dark-mode': makeFlag({ name: 'dark-mode', rolloutPercentage: 100 }),
  };
  client._ready = true;
  eq(client.isEnabled('dark-mode', 'user-1'), true);
  eq(client.isEnabled('unknown',   'user-1'), false);
});

test('evaluateAll returns all flag values', function () {
  var client = new nodeModule({ apiUrl: 'http://localhost:3001', sdkKey: 'x' });
  client._flags = {
    'flag-a': makeFlag({ name: 'flag-a', rolloutPercentage: 100 }),
    'flag-b': makeFlag({ name: 'flag-b', rolloutPercentage: 0   }),
  };
  client._ready = true;
  var all = client.evaluateAll('user-1');
  eq(all['flag-a'], true);
  eq(all['flag-b'], false);
});

test('middleware returns a function', function () {
  var client = new nodeModule({ apiUrl: 'http://localhost:3001', sdkKey: 'x' });
  eq(typeof client.middleware(), 'function');
});

test('middleware attaches req.flags with correct shape', function () {
  var client = new nodeModule({ apiUrl: 'http://localhost:3001', sdkKey: 'x' });
  client._flags = { 'x-flag': makeFlag({ name: 'x-flag', rolloutPercentage: 100 }) };
  client._ready = true;

  var mw = client.middleware();
  var req = { user: { id: 'user-99' } };
  mw(req, {}, function () {});

  assert.ok(typeof req.flags.isEnabled  === 'function');
  assert.ok(typeof req.flags.variation  === 'function');
  assert.ok(typeof req.flags.evaluateAll=== 'function');
  eq(req.flags.userId, 'user-99');
  eq(req.flags.isEnabled('x-flag'), true);
});

// ── SwitchOnClient (browser) unit tests ──────────────────────────────────────
console.log('\nSwitchOnClient class:');

// Browser SDK uses `fetch` and `EventSource` which don't exist in Node.
// We only test construction and error cases here.

var SwitchOnClient = require('../src/browser.js');

test('Constructor throws if apiUrl missing', function () {
  assert.throws(function () { new SwitchOnClient({ sdkKey: 'x' }); });
});

test('Constructor throws if sdkKey missing', function () {
  assert.throws(function () { new SwitchOnClient({ apiUrl: 'http://x' }); });
});

test('variation returns defaultValue before init', function () {
  var client = new SwitchOnClient({ apiUrl: 'http://x', sdkKey: 'x' });
  eq(client.variation('any', 'fallback'), 'fallback');
});

test('isEnabled returns false before init', function () {
  var client = new SwitchOnClient({ apiUrl: 'http://x', sdkKey: 'x' });
  eq(client.isEnabled('any'), false);
});

test('allFlags returns empty object before init', function () {
  var client = new SwitchOnClient({ apiUrl: 'http://x', sdkKey: 'x' });
  eq(client.allFlags(), {});
});

test('on/off event listener system works', function () {
  var client = new SwitchOnClient({ apiUrl: 'http://x', sdkKey: 'x' });
  var called = 0;
  function handler() { called++; }
  client.on('change', handler);
  client._emit('change', 'flag', true);
  eq(called, 1);
  client.off('change', handler);
  client._emit('change', 'flag', false);
  eq(called, 1, 'Should not fire after off()');
});

test('waitUntilReady returns a Promise', function () {
  var client = new SwitchOnClient({ apiUrl: 'http://x', sdkKey: 'x' });
  assert.ok(client.waitUntilReady() instanceof Promise);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + (failed === 0 ? '✅' : '❌'),
  passed + ' passed,', failed + ' failed\n');

if (failed > 0) process.exit(1);
