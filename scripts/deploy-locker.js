const { ethers, network, run } = require(`hardhat`);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying locker with:`, deployer.address, `on`, network.name);
  const factory = `0xaE1790ddDD25B2Fa95D4c0528b78F9210F4fA43B`;
  const pm = process.env.POSITION_MANAGER || ``;
  if (!pm) throw new Error(`Set POSITION_MANAGER in env`);
  const Locker = await ethers.getContractFactory(`LiquidityLocker`);
  const locker = await Locker.deploy(factory, pm);
  await locker.waitForDeployment();
  const addr = await locker.getAddress();
  console.log(`LiquidityLocker deployed to:`, addr);
  try {
    await run(`verify:verify`, { address: addr, constructorArguments: [factory, pm] });
    console.log(`Verified on explorer.`);
  } catch (e) {
    console.log(`Verify skipped/failed:`, (e.message || e).split(`\n`)[0]);
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
