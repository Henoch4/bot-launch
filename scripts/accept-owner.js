// Generate Safe transaction data for TokenFactory acceptOwner (Safe -> Safe)
// OFFLINE — no RPC needed. Call AFTER proposeOwner(Safe) is mined.
// No timelock on TokenFactory — can execute immediately.
// Run with plain node: node scripts/accept-owner-factory.js
const { ethers } = require('ethers');

const FACTORY = '0x839163E7d05531a1B1BEa5ac7352AA4cF2139764';

const iface = new ethers.Interface([
  'function acceptOwner()'
]);

const data = iface.encodeFunctionData('acceptOwner', []);

console.log(JSON.stringify({
  network: 'botMainnet',
  chainId: 677,
  contract: 'TokenFactory',
  address: FACTORY,
  from: 'Safe (0x3f6599D5694044Ac0B357695843391220a5aE0c3)',
  to: FACTORY,
  value: '0',
  data: data,
  operation: 0,
  description: 'Step 2: Safe calls acceptOwner(). Execute IMMEDIATELY after proposeOwner(Safe) is confirmed.'
}, null, 2));