// Generate gatekeeper handover + gating ON transaction data for TokenFactory
// OFFLINE — no RPC needed. Run with plain node.
// Gatekeeper EOA: 0xC894Ad5528a9Fd2eD6a077718c05B1d038FFD729 (rotated 2026-10-09 — prior key 0x45478D... leaked publicly, burned)
// [REDACTED: keys never go in files. New key lives in botchain-builds\gatekeeper-rotation.json, offline only.]
const { ethers } = require('ethers');

const FACTORY = '0x839163E7d05531a1B1BEa5ac7352AA4cF2139764';
const SAFE = '0x3f6599D5694044Ac0B357695843391220a5aE0c3';
const GATEKEEPER = '0xC894Ad5528a9Fd2eD6a077718c05B1d038FFD729';

const iface = new ethers.Interface([
  'function proposeGatekeeper(address g)',
  'function acceptGatekeeper()',
  'function setGating(bool enabled)'
]);

console.log('=== GATEKEEPER SETUP ===');
console.log('Fresh EOA: ', GATEKEEPER);
console.log('Private Key: [REDACTED — loaded from env only, never inline]');
console.log('BACKUP THIS PRIVATE KEY OFFLINE NOW. It controls mainnet gating.');
console.log('');

console.log('--- 1. Deployer proposes gatekeeper ---');
console.log(JSON.stringify({
  network: 'botMainnet', chainId: 677, contract: 'TokenFactory', address: FACTORY,
  from: 'deployer', to: FACTORY, value: '0',
  data: iface.encodeFunctionData('proposeGatekeeper', [GATEKEEPER]),
  operation: 0,
  description: 'Deployer calls proposeGatekeeper(freshEOA)'
}, null, 2));

console.log('--- 2. Fresh EOA accepts gatekeeper (no timelock) ---');
console.log(JSON.stringify({
  network: 'botMainnet', chainId: 677, contract: 'TokenFactory', address: FACTORY,
  from: 'gatekeeper EOA', to: FACTORY, value: '0',
  data: iface.encodeFunctionData('acceptGatekeeper', []),
  operation: 0,
  description: 'Gatekeeper EOA calls acceptGatekeeper() immediately after propose is mined'
}, null, 2));

console.log('--- 3. Gatekeeper enables gating ON ---');
console.log(JSON.stringify({
  network: 'botMainnet', chainId: 677, contract: 'TokenFactory', address: FACTORY,
  from: 'gatekeeper EOA', to: FACTORY, value: '0',
  data: iface.encodeFunctionData('setGating', [true]),
  operation: 0,
  description: 'Gatekeeper EOA calls setGating(true) — MAINNET GATING ON'
}, null, 2));