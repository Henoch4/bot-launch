// Generate gatekeeper handover + gating ON transaction data for TokenFactory
// OFFLINE — no RPC needed. Run with plain node.
// Gatekeeper EOA: 0x45478D362d78c31CFD7Af9D9f2F7c977751EfE3a
// PRIVATE KEY: 0x9d9a39cce9783563ec06a9a771c2c7b1151ddbd4dbe9aeb224676c824ffc485d
// BACKUP OFFLINE NOW.
const { ethers } = require('ethers');

const FACTORY = '0x839163E7d05531a1B1BEa5ac7352AA4cF2139764';
const SAFE = '0x3f6599D5694044Ac0B357695843391220a5aE0c3';
const GATEKEEPER = '0x45478D362d78c31CFD7Af9D9f2F7c977751EfE3a';

const iface = new ethers.Interface([
  'function proposeGatekeeper(address g)',
  'function acceptGatekeeper()',
  'function setGating(bool enabled)'
]);

console.log('=== GATEKEEPER SETUP ===');
console.log('Fresh EOA: ', GATEKEEPER);
console.log('Private Key: 0x9d9a39cce9783563ec06a9a771c2c7b1151ddbd4dbe9aeb224676c824ffc485d');
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