// Execute TokenFactory proposeGatekeeper(freshEOA) on mainnet
// Run: npx hardhat run scripts/execute-propose-gatekeeper.js --network botMainnet
const { ethers } = require('hardhat');

async function main() {
  const FACTORY = '0x839163E7d05531a1B1BEa5ac7352AA4cF2139764';
  // ROTATED 2026-10-09 (tx 0x429f70b5... block 26074053): previous pending key was
  // leaked publicly in git history — burned. Never propose the old address again.
  const GATEKEEPER = '0xC894Ad5528a9Fd2eD6a077718c05B1d038FFD729';

  const [deployer] = await ethers.getSigners();
  const factory = await ethers.getContractAt('TokenFactory', FACTORY);

  const owner = await factory.owner();
  console.log('Current owner:', owner);
  console.log('Deployer:', deployer.address);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error('Deployer is not the owner');
  }

  const tx = await factory.proposeGatekeeper(GATEKEEPER);
  console.log('Tx sent:', tx.hash);

  const rc = await tx.wait();
  console.log('Mined block:', rc.blockNumber);

  const pending = await factory.pendingGatekeeper();
  console.log('Pending gatekeeper:', pending);
}

main().catch(e => { console.error(e); process.exit(1); });