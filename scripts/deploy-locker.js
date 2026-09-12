const { ethers, network, run } = require(`hardhat`);
const fs = require(`fs`);
const path = require(`path`);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying locker with:`, deployer.address, `on`, network.name);
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, `..`, `config`, `addresses.json`), `utf8`));
  const netCfg = cfg[network.name] || {};
  const mainnetFactory = `0x839163E7d05531a1B1BEa5ac7352AA4cF2139764`;
  const factory = process.env.LAUNCH_FACTORY
    || (network.name === `botMainnet` ? mainnetFactory : ``)
    || netCfg.launcherFactory || ``;
  const pm = process.env.POSITION_MANAGER || netCfg.positionManager || ``;
  if (!factory || !pm) throw new Error(`Set LAUNCH_FACTORY plus POSITION_MANAGER (env or config/addresses.json)`);
  console.log(`Factory:`, factory, `PM:`, pm);
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
