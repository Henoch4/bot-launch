# BotLaunch - BDEX native token launcher for BOT Chain

Project 2 of 3 - money engine targeting Scheme A DEX incentives.
Factory mints BotToken with full supply to creator, then ensurePool creates or reuses the BDEX V3 pool.

## Security model (threat-first)

This launcher is a memecoin-onramp, which makes it a magnet for rug-pull / mint-drain /
spoof-deploy attacks. The contract enforces a **listing gate** so the operator decides
which tokens are admissible to the DEX pool path.

- **Listing gate** - `setGating(true)` turns on `NotVerified` enforcement inside
  `ensurePool`: only tokens an operator marked via `setVerified(token, true)` can create
  a pool. Default is OFF so the contract is deploy-and-test friendly, but on mainnet the
  operator runs gating ON. Scream-filter: ~95% of pre-buy symbols get rejected before listing.
- **No renounce = no proximal placement** - a token whose creator can still mint /
  manipulate supply should never be verified. Verify only tokens with LP locked
  (Liquidity Locker at dev-docs.botchain.ai/docs/Liquidity-Locker) and ownership renounced / timelocked.
- **Never blind-integrate the Liquidity Locker** - an "unmodified import shipped as own
  work" is a supply-chain trap. Read its source and its pause/withdraw surface before wiring.
- **Two-key wall (planned)** - split the launch wallet (operator) from a settlement wallet
  before real volume. One key controlling both mint + pool + liquidity is a single point of failure.
- **LP-tamper monitor (planned)** - post-launch watch hook capturing deterministic
  pool-state triggers (position burn, liquidity drain), same family as Tarstrade pivot exits.

Phase 2 (see below) is where value leaks if an operator signs off too fast. Gating exists
so the decode of "is this safe to list" is never rushed under user pressure.

## Phase 2 after pool creation
1. Price init via position manager createAndInitializePoolIfNecessary
2. Add concentrated liquidity inside a tight range
3. Lock LP via Liquidity Locker docs at dev-docs.botchain.ai/docs/Liquidity-Locker
4. Pair token against BOT to earn the 20 percent Scheme A bonus

## Mainnet addresses baked in
- V3 factory 0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419
- Position manager 0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090
- Universal router 0xaE6ae8630f7A888dEc0B9195C85F7515d5887655
- WBOT 0xD5452816194a3784dBa983426cCe7c122F4abd30
- USDT 0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C

## Commands
- npm install
- npx hardhat test
- npx hardhat run scripts/deploy.js --network botTestnet with V3FACTORY env set
- npx hardhat run scripts/deploy.js --network botMainnet
