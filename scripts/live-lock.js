const { ethers, network } = require(`hardhat`);
const Q96 = 2n ** 96n;
async function main() {
  const [deployer] = await ethers.getSigners();
  const FACTORY = `0xaE1790ddDD25B2Fa95D4c0528b78F9210F4fA43B`;
  const LOCKER = `0x9276644dC1E26a6d183a5e76321BF6e92a0c2d67`;
  const factory = await ethers.getContractAt(`TokenFactory`, FACTORY);
  const locker = await ethers.getContractAt(`LiquidityLocker`, LOCKER);
  console.log(`net:`, network.name, `me:`, deployer.address);

  const tA = await factory.createToken.staticCall(`LockTestA`, `LKTA`, 1000000n);
  await (await factory.createToken(`LockTestA`, `LKTA`, 1000000n)).wait();
  const tB = await factory.createToken.staticCall(`LockTestB`, `LKTB`, 1000000n);
  await (await factory.createToken(`LockTestB`, `LKTB`, 1000000n)).wait();
  console.log(`minted:`, tA, tB);
  await (await factory.setVerified(tA, true)).wait();
  await (await factory.setVerified(tB, true)).wait();
  console.log(`verified both (gatekeeper=${await factory.gatekeeper()})`);

  for (const t of [tA, tB]) {
    const tok = await ethers.getContractAt(`BotToken`, t);
    await (await tok.approve(LOCKER, 1000000n)).wait();
  }
  console.log(`approved locker`);
  const now = Math.floor(Date.now() / 1000);
  const tx = await locker.lockLiquidity([tA, tB, 3000, Q96, -600, 600, 500n, 500n, 0n, 0n, 70, now + 900]);
  const rc = await tx.wait();
  console.log(`lock tx:`, rc.hash);
  const lock = await locker.locks(1);
  console.log(`lock#1 tokenId:`, lock.tokenId.toString(), `unlockAt:`, new Date(Number(lock.unlockAt) * 1000).toISOString());
  const pm = await ethers.getContractAt(
    [`function ownerOf(uint256) view returns (address)`],
    `0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090`
  );
  console.log(`real PM owns NFT:`, await pm.ownerOf(lock.tokenId), `(locker=${LOCKER})`);

  console.log(`waiting 80s for unlock...`);
  await new Promise((r) => setTimeout(r, 80000));
  await (await locker.withdraw(1)).wait();
  console.log(`withdrawn. NFT now:`, await pm.ownerOf(lock.tokenId), `(me=${deployer.address})`);
  console.log(`LIVE_LOCK_OK`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
