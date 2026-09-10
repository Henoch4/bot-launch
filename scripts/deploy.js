const { ethers, network } = require(`hardhat`);

const MAINNET = {
  v3factory: `0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419`,
  manager: `0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090`,
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with:`, deployer.address);
  const chainId = network.config.chainId;
  console.log(`Network chainId:`, chainId);
  const expected = network.name === `botMainnet` ? 677 : network.name === `botTestnet` ? 968 : chainId;
  if (chainId !== expected) { throw new Error(`chain guard`); }
  let v3factory = process.env.V3FACTORY || ``;
  let manager = process.env.POSITION_MANAGER || ``;
  if (chainId === 677) {
    v3factory = MAINNET.v3factory;
    manager = MAINNET.manager;
  }
  if (v3factory === `` || manager === ``) { throw new Error(`Set V3FACTORY plus POSITION_MANAGER in env for testnet`); }
  const Factory = await ethers.getContractFactory(`TokenFactory`);
  const factory = await Factory.deploy(v3factory, manager);
  await factory.waitForDeployment();
  const addr = await factory.getAddress();
  console.log(`TokenFactory deployed to:`, addr);
  console.log(`Verify at: https://scan.botchain.ai/address/` + addr);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
