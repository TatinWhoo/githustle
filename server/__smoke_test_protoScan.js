const { hasPollutionKey } = require('./src/security/protoScan');
const assert = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); };

// primitives -> false
assert(!hasPollutionKey(null),      'null');
assert(!hasPollutionKey(undefined), 'undefined');
assert(!hasPollutionKey(42),        'number');
assert(!hasPollutionKey('hello'),   'string');
assert(!hasPollutionKey(true),      'boolean');

// clean objects -> false
assert(!hasPollutionKey({}),                      'empty obj');
assert(!hasPollutionKey({ a: 1, b: { c: 2 } }),  'nested clean');
assert(!hasPollutionKey([1, 2, 3]),               'clean array');

// NOTE: { __proto__: {} } literal does NOT create an own key (sets the prototype chain).
// Object.keys won't see it — that is correct JS semantics.
// The real attack vector is JSON.parse, which DOES create an own key.

// JSON.parse creates own keys — these are the real attack vectors
const p1 = JSON.parse('{"__proto__": {"isAdmin": true}}');
assert(hasPollutionKey(p1), 'JSON.parse __proto__ own key');

const p2 = JSON.parse('{"constructor": {"prototype": {"isAdmin": true}}}');
assert(hasPollutionKey(p2), 'JSON.parse constructor own key');

const p3 = JSON.parse('{"prototype": {}}');
assert(hasPollutionKey(p3), 'JSON.parse prototype own key');

// forbidden at depth via JSON.parse -> true
const nested = JSON.parse('{"a": {"b": {"__proto__": {}}}}');
assert(hasPollutionKey(nested), '__proto__ nested at depth 3');

const inArray = JSON.parse('[{"constructor": {}}]');
assert(hasPollutionKey(inArray), 'constructor inside array element');

const deepArray = JSON.parse('{"x": [1, {"prototype": {}}]}');
assert(hasPollutionKey(deepArray), 'prototype deep in array');

// clean but has keys named similarly (not the forbidden set)
assert(!hasPollutionKey({ proto: 1, construct: 2 }), 'similar but safe keys');

// circular reference -> no infinite loop, no throw
const circ = {};
circ.self = circ;
assert(!hasPollutionKey(circ), 'circular ref safe - no infinite loop');

// circular with poison
const circPoison = JSON.parse('{"__proto__": {"isAdmin": true}}');
circPoison.self = circPoison;
assert(hasPollutionKey(circPoison), 'circular + poison detected');

console.log('All smoke test assertions passed.');
