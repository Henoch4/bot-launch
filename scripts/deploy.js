const { ethers, network, run } = require(`hardhat`);
const fs = require(`fs`);
const path = require(`path`);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with:`, deployer.address);
  const chainId = network.config.chainId;
  console.log(`Network chainId:`, chainId);
  const expected = network.name === `botMainnet` ? 677 : network.name === `botTestnet` ? 968 : chainId;
  if (chainId !== expected) { throw new Error(`chain guard`); }
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, `..`, `config`, `addresses.json`), `utf8`));
  const netCfg = cfg[network.name] || {};
  const v3factory = process.env.V3FACTORY || netCfg.v3factory || ``;
  const manager = process.env.POSITION_MANAGER || netCfg.positionManager || ``;
  if (v3factory === `` || manager === ``) { throw new Error(`Set V3FACTORY plus POSITION_MANAGER in env for testnet`); }
  const Factory = await ethers.getContractFactory(`TokenFactory`);
  const factory = await Factory.deploy(v3factory, manager);
  await factory.waitForDeployment();
  const addr = await factory.getAddress();
  const txHash = factory.deploymentTransaction().hash;
  console.log(`TokenFactory deployed to:`, addr);
  try {
    await run(`verify:verify`, { address: addr, constructorArguments: [v3factory, manager] });
    console.log(`Verified on explorer.`);
  } catch (e) {
    console.log(`Verify skipped/failed:`, (e.message || e).split(`\n`)[0]);
  }
  const logPath = path.join(__dirname, `..`, `config`, `deployments.log`);
  fs.appendFileSync(logPath, `${new Date().toISOString()} ${network.name} ${addr} ${txHash}\n`);
  console.log(`Logged to config/deployments.log`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
