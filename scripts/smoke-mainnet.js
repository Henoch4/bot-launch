const { ethers, network } = require(`hardhat`);
const FACTORY = `0x839163E7d05531a1B1BEa5ac7352AA4cF2139764`;
const LOCKER = `0x4F2c0C7Aa493BA2770DE3d4b08C3B64761c36bFc`;
async function main() {
  const f = await ethers.getContractAt(`TokenFactory`, FACTORY);
  const l = await ethers.getContractAt(`LiquidityLocker`, LOCKER);
  const [owner, gatekeeper, gating, v3f, pm, lockCount, fee3000] = await Promise.all([
    f.owner(), f.gatekeeper(), f.gatingEnabled(), f.v3factory(),
    f.positionManager(), l.lockCount(), f.supportedFee(3000),
  ]);
  console.log(JSON.stringify({
    network: network.name, factory: FACTORY, locker: LOCKER,
    owner, gatekeeper, gating, v3factory: v3f, positionManager: pm,
    lockerFactory: await l.factory(), lockerPM: await l.positionManager(),
    lockCount: lockCount.toString(), fee3000,
  }));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
