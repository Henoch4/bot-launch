const { ethers } = require(`hardhat`);
async function main(){
  const gasPrice = await ethers.provider.getFeeData().then((d) => d.gasPrice);
  const f = await ethers.getContractFactory(`TokenFactory`);
  const c = await f.deploy(`0x0000000000000000000000000000000000000001`, `0x0000000000000000000000000000000000000002`);
  const rc = await c.deploymentTransaction().wait();
  const gas = BigInt(rc.gasUsed);
  const cost = gas * gasPrice;
  console.log(JSON.stringify({contract:`TokenFactory`, gasUsed:gas.toString(), botCost:ethers.formatEther(cost), gasPriceGwei:ethers.formatUnits(gasPrice, `gwei`)}));
}
main().catch((e)=>{ console.error(e); process.exitCode = 1; });