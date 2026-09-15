// Execute TokenFactory proposeOwner(Safe) on mainnet
// Run: npx hardhat run scripts/execute-propose-owner.js --network botMainnet
const { ethers } = require('hardhat');

async function main() {
  const FACTORY = '0x839163E7d05531a1B1BEa5ac7352AA4cF2139764';
  const SAFE = '0x3f6599D5694044Ac0B357695843391220a5aE0c3';

  const [deployer] = await ethers.getSigners();
  const factory = await ethers.getContractAt('TokenFactory', FACTORY);

  const owner = await factory.owner();
  console.log('Current owner:', owner);
  console.log('Deployer:', deployer.address);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error('Deployer is not the owner');
  }

  const tx = await factory.proposeOwner(SAFE);
  console.log('Tx sent:', tx.hash);

  const rc = await tx.wait();
  console.log('Mined block:', rc.blockNumber);

  const pending = await factory.pendingOwner();
  console.log('Pending owner:', pending);
}

main().catch(e => { console.error(e); process.exit(1); });