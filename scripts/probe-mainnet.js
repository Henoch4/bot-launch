const { ethers, network } = require(`hardhat`);
const ADDRS = {
  v3factory: `0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419`,
  positionManager: `0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090`,
  router: `0xaE6ae8630f7A888dEc0B9195C85F7515d5887655`,
  wbot: `0xD5452816194a3784dBa983426cCe7c122F4abd30`,
  usdt: `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C`,
};
async function main() {
  const out = { network: network.name };
  for (const [k, a] of Object.entries(ADDRS)) {
    const code = await ethers.provider.getCode(a);
    out[k] = code === `0x` ? `EMPTY` : `code:${code.length}`;
  }
  console.log(JSON.stringify(out));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
