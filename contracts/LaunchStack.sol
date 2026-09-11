// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BotToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    error Insufficient();
    constructor(string memory n, string memory s, uint256 supply, address to) {
        name = n;
        symbol = s;
        totalSupply = supply;
        balanceOf[to] = supply;
        emit Transfer(address(0), to, supply);
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) revert Insufficient();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (balanceOf[from] < amount) revert Insufficient();
        if (allowance[from][msg.sender] < amount) revert Insufficient();
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

interface IBotV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
}

interface IBotPositionManager {
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

contract TokenFactory {
    address public owner;
    address public gatekeeper;
    address public pendingOwner;
    address public pendingGatekeeper;
    address public v3factory;
    address public positionManager;
    mapping(address => bool) public verified;
    bool public gatingEnabled;
    address[] public allTokens;
    mapping(address => address) public tokenCreator;
    mapping(uint24 => bool) public supportedFee;
    event TokenCreated(address indexed token, address indexed creator, uint256 supply);
    event PoolReady(address indexed token, address indexed base, address pool, uint24 fee);
    event Verified(address indexed token, bool verified);
    event GatingSet(bool enabled);
    event OwnerProposed(address indexed newOwner);
    event OwnerAccepted(address indexed newOwner);
    event GatekeeperProposed(address indexed newGatekeeper);
    event GatekeeperAccepted(address indexed newGatekeeper);
    event FeeTierSet(uint24 fee, bool supported);
    error NotOwner();
    error NotGatekeeper();
    error NotPending();
    error ZeroAddr();
    error NotVerified();
    error BadFeeTier();
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    modifier onlyGatekeeper() {
        if (msg.sender != gatekeeper) revert NotGatekeeper();
        _;
    }
    constructor(address _v3factory, address _positionManager) {
        if (_v3factory == address(0) || _positionManager == address(0)) revert ZeroAddr();
        owner = msg.sender;
        gatekeeper = msg.sender;
        v3factory = _v3factory;
        positionManager = _positionManager;
        supportedFee[100] = true;
        supportedFee[500] = true;
        supportedFee[3000] = true;
        supportedFee[10000] = true;
    }
    // Two-step handover so a typo'd address cannot brick either key.
    function proposeOwner(address o) external onlyOwner {
        if (o == address(0)) revert ZeroAddr();
        pendingOwner = o;
        emit OwnerProposed(o);
    }
    function acceptOwner() external {
        if (msg.sender != pendingOwner) revert NotPending();
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnerAccepted(owner);
    }
    function proposeGatekeeper(address g) external onlyOwner {
        if (g == address(0)) revert ZeroAddr();
        pendingGatekeeper = g;
        emit GatekeeperProposed(g);
    }
    function acceptGatekeeper() external {
        if (msg.sender != pendingGatekeeper) revert NotPending();
        gatekeeper = pendingGatekeeper;
        pendingGatekeeper = address(0);
        emit GatekeeperAccepted(gatekeeper);
    }
    function setFeeTier(uint24 fee, bool supported) external onlyOwner {
        supportedFee[fee] = supported;
        emit FeeTierSet(fee, supported);
    }
    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }
    function createToken(string memory n, string memory s, uint256 supply) external returns (address t) {
        BotToken token = new BotToken(n, s, supply, msg.sender);
        t = address(token);
        allTokens.push(t);
        tokenCreator[t] = msg.sender;
        emit TokenCreated(t, msg.sender, supply);
    }
    // Listing gate: only the gatekeeper admits tokens to the DEX pool path.
    function setVerified(address token, bool v) external onlyGatekeeper {
        if (token == address(0)) revert ZeroAddr();
        verified[token] = v;
        emit Verified(token, v);
    }
    function setGating(bool enable) external onlyOwner {
        gatingEnabled = enable;
        emit GatingSet(enable);
    }
    function ensurePool(address token, address base, uint24 fee) external returns (address pool) {
        if (token == address(0) || base == address(0)) revert ZeroAddr();
        if (!supportedFee[fee]) revert BadFeeTier();
        if (gatingEnabled && verified[token] != true) revert NotVerified();
        pool = IBotV3Factory(v3factory).getPool(token, base, fee);
        if (pool == address(0)) {
            pool = IBotV3Factory(v3factory).createPool(token, base, fee);
        }
        emit PoolReady(token, base, pool, fee);
    }
}