const { expect } = require(`chai`);
const { ethers } = require(`hardhat`);

describe(`TokenFactory`, function () {
  async function deploy() {
    const [owner, user] = await ethers.getSigners();
    const Mock = await ethers.getContractFactory(`MockV3Factory`);
    const mock = await Mock.deploy();
    const Factory = await ethers.getContractFactory(`TokenFactory`);
    const factory = await Factory.deploy(await mock.getAddress(), user.address);
    return { owner, user, mock, factory };
  }

  it(`creates ERC20 with full supply to creator`, async function () {
    const { owner, factory } = await deploy();
    const addr = await factory.createToken.staticCall(`Test`, `TST`, 1000000);
    await expect(factory.createToken(`Test`, `TST`, 1000000)).to.emit(factory, `TokenCreated`);
    const token = await ethers.getContractAt(`BotToken`, addr);
    expect(await token.balanceOf(owner.address)).to.equal(1000000);
    expect(await token.totalSupply()).to.equal(1000000);
  });

  it(`ensurePool creates once then reuses`, async function () {
    const { owner, user, mock, factory } = await deploy();
    const addr = await factory.createToken.staticCall(`Test`, `TST`, 1000);
    await factory.createToken(`Test`, `TST`, 1000);
    await mock.setNextPool(user.address);
    const p1 = await factory.ensurePool.staticCall(addr, owner.address, 3000);
    await expect(factory.ensurePool(addr, owner.address, 3000)).to.emit(factory, `PoolReady`);
    expect(p1).to.equal(user.address);
    await mock.setNextPool(owner.address);
    const p2 = await factory.ensurePool.staticCall(addr, owner.address, 3000);
    expect(p2).to.equal(user.address);
  });

  it(`reverts on zero addresses`, async function () {
    const { owner, factory } = await deploy();
    await expect(factory.ensurePool(ethers.ZeroAddress, owner.address, 3000))
      .to.be.revertedWithCustomError(factory, `ZeroAddr`);
  });

  it(`reverts deploy with zero factory`, async function () {
    const Factory = await ethers.getContractFactory(`TokenFactory`);
    await expect(Factory.deploy(ethers.ZeroAddress, ethers.ZeroAddress))
      .to.be.revertedWithCustomError(Factory, `ZeroAddr`);
  });

it(`reverts deploy with zero position manager`, async function () {
    const Mock = await ethers.getContractFactory(`MockV3Factory`);
    const mock = await Mock.deploy();
    const Factory = await ethers.getContractFactory(`TokenFactory`);
    await expect(Factory.deploy(await mock.getAddress(), ethers.ZeroAddress))
      .to.be.revertedWithCustomError(Factory, `ZeroAddr`);
  });

  it(`listing gate blocks unverified tokens from pool creation`, async function () {
    const { owner, user, mock, factory } = await deploy();
    const addr = await factory.createToken.staticCall(`Test`, `TST`, 1000);
    await factory.createToken(`Test`, `TST`, 1000);
    await mock.setNextPool(user.address);
    await factory.setGating(true);
    await expect(factory.ensurePool(addr, owner.address, 3000))
      .to.be.revertedWithCustomError(factory, `NotVerified`);
    await expect(factory.setVerified(addr, true)).to.emit(factory, `Verified`);
    await expect(factory.ensurePool(addr, owner.address, 3000)).to.emit(factory, `PoolReady`);
  });

  it(`only owner can verify tokens or toggle gating`, async function () {
    const { owner, user, factory } = await deploy();
    await expect(factory.connect(user).setVerified(owner.address, true))
      .to.be.revertedWithCustomError(factory, `NotOwner`);
    await expect(factory.connect(user).setGating(true))
      .to.be.revertedWithCustomError(factory, `NotOwner`);
    await expect(factory.connect(owner).setVerified(ethers.ZeroAddress, true))
      .to.be.revertedWithCustomError(factory, `ZeroAddr`);
  });
});
