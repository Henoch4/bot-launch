const { ethers } = require(`hardhat`);
async function main() {
  const F = `0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419`;
  const PM = `0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090`;
  for (const [name, addr] of [[`v3factory`, F], [`positionManager`, PM]]) {
    const code = await ethers.provider.getCode(addr);
    console.log(name, addr, `codeLen:`, (code.length - 2) / 2, `bytes`);
  }
  // Is the factory interface-responsive?
  try {
    const f = new ethers.Contract(F, [`function owner() view returns (address)`], ethers.provider);
    console.log(`factory.owner():`, await f.owner());
  } catch (e) { console.log(`factory.owner() failed:`, (e.shortMessage || e.message).slice(0, 120)); }
  try {
    const pm = new ethers.Contract(PM, [`function factory() view returns (address)`], ethers.provider);
    console.log(`pm.factory():`, await pm.factory());
  } catch (e) { console.log(`pm.factory() failed:`, (e.shortMessage || e.message).slice(0, 120)); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
