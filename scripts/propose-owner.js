// Generate Safe transaction data for TokenFactory proposeOwner -> Safe
// OFFLINE — no RPC needed. Chain state: owner=deployer, pendingOwner=none
// Run with plain node: node scripts/propose-owner-factory.js
// After mining, Safe calls acceptOwner() immediately (no timelock)
const { ethers } = require('ethers');

const SAFE = '0x3f6599D5694044Ac0B357695843391220a5aE0c3';
const FACTORY = '0x839163E7d05531a1B1BEa5ac7352AA4cF2139764';

const iface = new ethers.Interface([
  'function proposeOwner(address o)'
]);

const data = iface.encodeFunctionData('proposeOwner', [SAFE]);

console.log(JSON.stringify({
  network: 'botMainnet',
  chainId: 677,
  contract: 'TokenFactory',
  address: FACTORY,
  from: 'deployer (0xCeA3A19feb565bee69e505112d405b1a1f31F230)',
  to: FACTORY,
  value: '0',
  data: data,
  operation: 0,
  description: 'Step 1: Deployer calls proposeOwner(Safe). Then immediately: Safe calls acceptOwner() (no timelock).'
}, null, 2));