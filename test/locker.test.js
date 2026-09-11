const { expect } = require(`chai`);
const { ethers } = require(`hardhat`);

const Q96 = 2n ** 96n;

describe(`LiquidityLocker`, function () {
  async function setup() {
    const [owner, user] = await ethers.getSigners();
    const MockF = await ethers.getContractFactory(`MockV3Factory`);
    const mockF = await MockF.deploy();
    const MockP = await ethers.getContractFactory(`MockPool`);
    const mockPool = await MockP.deploy();
    const MockPM = await ethers.getContractFactory(`MockPositionManager`);
    const mockPM = await MockPM.deploy();
    const Factory = await ethers.getContractFactory(`TokenFactory`);
    const factory = await Factory.deploy(await mockF.getAddress(), await mockPM.getAddress());
    const Locker = await ethers.getContractFactory(`LiquidityLocker`);
    const locker = await Locker.deploy(await factory.getAddress(), await mockPM.getAddress());
    await mockF.setNextPool(await mockPool.getAddress());
    const tA = await factory.createToken.staticCall(`Alpha`, `ALP`, ethers.parseEther(`1000`));
    await factory.createToken(`Alpha`, `ALP`, ethers.parseEther(`1000`));
    const tB = await factory.createToken.staticCall(`Beta`, `BET`, ethers.parseEther(`1000`));
    await factory.createToken(`Beta`, `BET`, ethers.parseEther(`1000`));
    return { owner, user, factory, locker, mockPool, mockPM, tA, tB };
  }

  async function approveBoth(s, tA, tB, locker) {
    const a = await ethers.getContractAt(`BotToken`, tA);
    const b = await ethers.getContractAt(`BotToken`, tB);
    const L = await locker.getAddress();
    await a.approve(L, ethers.parseEther(`1000`));
    await b.approve(L, ethers.parseEther(`1000`));
    return { a, b };
  }

  it(`full path: verify, init price, mint, lock, withdraw after expiry`, async function () {
    const { owner, factory, locker, mockPool, mockPM, tA, tB } = await setup();
    await factory.setVerified(tA, true);
    await factory.setVerified(tB, true);
    await approveBoth(owner, tA, tB, locker);
    const L = await locker.getAddress();
    const P = [tA, tB, 3000, Q96, -600, 600,
      ethers.parseEther(`10`), ethers.parseEther(`10`), 0, 0, 3600,
      Math.floor(Date.now() / 1000) + 3600];
    await expect(locker.lockLiquidity(P)).to.emit(locker, `LockCreated`);
    expect(await mockPool.initialized()).to.equal(true);
    expect(await mockPool.price()).to.equal(Q96);
    expect(await locker.lockCount()).to.equal(1);
    expect(await mockPM.ownerOf(1)).to.equal(L);
    await expect(locker.withdraw(1)).to.be.revertedWithCustomError(locker, `TooEarly`);
    await ethers.provider.send(`evm_increaseTime`, [3601]);
    await ethers.provider.send(`evm_mine`, []);
    await expect(locker.withdraw(1)).to.emit(locker, `Withdrawn`);
    expect(await mockPM.ownerOf(1)).to.equal(owner.address);
  });

  it(`gate inherited: unverified token reverts through the locker`, async function () {
    const { factory, locker, tA, tB } = await setup();
    await factory.setGating(true);
    await expect(locker.lockLiquidity([tA, tB, 3000, Q96, -600, 600, 1, 1, 0, 0, 3600,
      Math.floor(Date.now() / 1000) + 3600]))
      .to.be.revertedWithCustomError(factory, `NotVerified`);
  });

  it(`rejects bad ticks and short locks`, async function () {
    const { factory, locker, tA, tB } = await setup();
    await factory.setVerified(tA, true);
    await factory.setVerified(tB, true);
    await expect(locker.lockLiquidity([tA, tB, 3000, Q96, 600, -600, 1, 1, 0, 0, 3600,
      Math.floor(Date.now() / 1000) + 3600]))
      .to.be.revertedWithCustomError(locker, `BadTicks`);
    await expect(locker.lockLiquidity([tA, tB, 3000, Q96, -600, 600, 1, 1, 0, 0, 10,
      Math.floor(Date.now() / 1000) + 3600]))
      .to.be.revertedWithCustomError(locker, `BadTime`);
  });
});
