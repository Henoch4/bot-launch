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