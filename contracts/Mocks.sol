// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockV3Factory {
    mapping(bytes32 => address) public pools;
    address public nextPool;
    event PoolCreated(address tokenA, address tokenB, uint24 fee, address pool);
    error NoPool();
    function setNextPool(address p) external {
        nextPool = p;
    }
    function keyOf(address a, address b, uint24 fee) internal pure returns (bytes32) {
        return keccak256(abi.encode(a, b, fee));
    }
    function getPool(address a, address b, uint24 fee) external view returns (address) {
        return pools[keyOf(a, b, fee)];
    }
    function createPool(address a, address b, uint24 fee) external returns (address) {
        address p = nextPool;
        if (p == address(0)) revert NoPool();
        pools[keyOf(a, b, fee)] = p;
        emit PoolCreated(a, b, fee, p);
        return p;
    }
}

contract MockPool {
    uint160 public price;
    bool public initialized;
    function initialize(uint160 sqrtPriceX96) external {
        price = sqrtPriceX96;
        initialized = true;
    }
    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool) {
        return (price, 0, 0, 0, 0, 0, false);
    }
}

interface IMockERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MockPositionManager {
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
    uint256 public nextTokenId = 1;
    mapping(uint256 => address) public nftOwner;
    event Minted(uint256 tokenId, address recipient);
    function mint(MintParams calldata p) external returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) {
        // Pull both tokens from the caller (locker approved this manager).
        require(IMockERC20(p.token0).transferFrom(msg.sender, address(this), p.amount0Desired));
        require(IMockERC20(p.token1).transferFrom(msg.sender, address(this), p.amount1Desired));
        tokenId = nextTokenId++;
        nftOwner[tokenId] = p.recipient;
        liquidity = uint128(p.amount0Desired + p.amount1Desired);
        amount0 = p.amount0Desired;
        amount1 = p.amount1Desired;
        emit Minted(tokenId, p.recipient);
    }
    function ownerOf(uint256 tokenId) external view returns (address) {
        return nftOwner[tokenId];
    }
    function transferFrom(address from, address to, uint256 tokenId) external {
        require(nftOwner[tokenId] == from);
        nftOwner[tokenId] = to;
    }
}