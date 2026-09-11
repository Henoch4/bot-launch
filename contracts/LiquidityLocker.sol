// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILaunchFactory {
    function ensurePool(address token, address base, uint24 fee) external returns (address pool);
}

interface IV3Pool {
    function initialize(uint160 sqrtPriceX96) external;
    function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 o, uint16 p, uint16 f, uint8 u, bool locked);
}

interface IPM {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }
    function mint(MintParams calldata params) external returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
}

interface IERC20P {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IERC721P {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

// Phase 2 money engine, additive: factory untouched. Gate inherited via
// ensurePool (unverified + gating-on reverts). LP NFT held until unlockAt.
contract LiquidityLocker {
    address public factory;
    address public positionManager;
    uint256 public lockCount;
    uint256 public constant MIN_LOCK = 60;

    struct Lock {
        uint256 tokenId;
        address creator;
        address token;
        address base;
        uint64 unlockAt;
        bool withdrawn;
    }

    mapping(uint256 => Lock) public locks;

    event LockCreated(uint256 indexed id, uint256 indexed tokenId, address indexed creator, uint64 unlockAt);
    event Withdrawn(uint256 indexed id, uint256 indexed tokenId, address indexed to);

    error ZeroAddr();
    error BadTime();
    error BadTicks();
    error TooEarly();
    error Done();

    constructor(address _factory, address _positionManager) {
        if (_factory == address(0) || _positionManager == address(0)) revert ZeroAddr();
        factory = _factory;
        positionManager = _positionManager;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    struct LockParams {
        address token;
        address base;
        uint24 fee;
        uint160 sqrtPriceX96;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint64 lockDuration;
        uint256 deadline;
    }

    function lockLiquidity(LockParams calldata p) external returns (uint256 id, uint256 tokenId) {
        if (p.token == address(0) || p.base == address(0)) revert ZeroAddr();
        if (p.tickLower >= p.tickUpper) revert BadTicks();
        if (p.lockDuration < MIN_LOCK) revert BadTime();
        _ensureInitialized(p.token, p.base, p.fee, p.sqrtPriceX96);
        tokenId = _pullAndMint(p);
        id = ++lockCount;
        locks[id] = Lock({
            tokenId: tokenId,
            creator: msg.sender,
            token: p.token,
            base: p.base,
            unlockAt: uint64(block.timestamp) + p.lockDuration,
            withdrawn: false
        });
        emit LockCreated(id, tokenId, msg.sender, locks[id].unlockAt);
    }

    function _ensureInitialized(address token, address base, uint24 fee, uint160 sqrtPriceX96) internal {
        // Gate inherited: reverts NotVerified for ungated listings.
        address pool = ILaunchFactory(factory).ensurePool(token, base, fee);
        (uint160 cur,) = _slot0(pool);
        if (cur == 0) {
            if (sqrtPriceX96 == 0) revert BadTime();
            IV3Pool(pool).initialize(sqrtPriceX96);
        }
    }

    function _pullAndMint(LockParams calldata p) internal returns (uint256 tokenId) {
        (address t0, address t1, uint256 a0, uint256 a1) = p.token < p.base
            ? (p.token, p.base, p.amount0Desired, p.amount1Desired)
            : (p.base, p.token, p.amount1Desired, p.amount0Desired);
        if (!IERC20P(t0).transferFrom(msg.sender, address(this), a0)) revert ZeroAddr();
        if (!IERC20P(t1).transferFrom(msg.sender, address(this), a1)) revert ZeroAddr();
        IERC20P(t0).approve(positionManager, a0);
        IERC20P(t1).approve(positionManager, a1);
        (tokenId,,,) = IPM(positionManager).mint(IPM.MintParams({
            token0: t0,
            token1: t1,
            fee: p.fee,
            tickLower: p.tickLower,
            tickUpper: p.tickUpper,
            amount0Desired: a0,
            amount1Desired: a1,
            amount0Min: p.amount0Min,
            amount1Min: p.amount1Min,
            recipient: address(this),
            deadline: p.deadline
        }));
    }

    function withdraw(uint256 id) external {
        Lock storage l = locks[id];
        if (l.creator == address(0) || l.withdrawn) revert Done();
        if (block.timestamp < l.unlockAt) revert TooEarly();
        l.withdrawn = true;
        IERC721P(positionManager).transferFrom(address(this), l.creator, l.tokenId);
        emit Withdrawn(id, l.tokenId, l.creator);
    }

    function _slot0(address pool) internal view returns (uint160 sqrtPriceX96, bool ok) {
        try IV3Pool(pool).slot0() returns (uint160 p, int24, uint16, uint16, uint16, uint8, bool) {
            return (p, true);
        } catch {
            return (0, false);
        }
    }
}
