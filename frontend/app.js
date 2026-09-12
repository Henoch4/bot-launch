import * as ethers from 'ethers';
import { createAppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';

const NETS={
  968:{label:`testnet`,rpc:`https://rpc.bohr.life`,explorer:`https://scan.bohr.life`,
    factory:`0xaE1790ddDD25B2Fa95D4c0528b78F9210F4fA43B`,
    locker:`0x9276644dC1E26a6d183a5e76321BF6e92a0c2d67`},
  677:{label:`mainnet`,rpc:`https://rpc.botchain.ai`,explorer:`https://scan.botchain.ai`,
    factory:`0x839163E7d05531a1B1BEa5ac7352AA4cF2139764`,
    locker:`0x4F2c0C7Aa493BA2770DE3d4b08C3B64761c36bFc`},
};
const NET_KEY=`bl_net`;
let CHAIN_ID=Number(localStorage.getItem(NET_KEY))||968;
if(!NETS[CHAIN_ID])CHAIN_ID=968;
let RPC=NETS[CHAIN_ID].rpc;
let EXPLORER=NETS[CHAIN_ID].explorer;
let FACTORY_DEFAULT=NETS[CHAIN_ID].factory;
let LOCKER_DEFAULT=NETS[CHAIN_ID].locker;
function netObj(id){return id===677?botMainnet:botTestnet;}
function applyNet(id){
  CHAIN_ID=id;RPC=NETS[id].rpc;EXPLORER=NETS[id].explorer;
  FACTORY_DEFAULT=NETS[id].factory;LOCKER_DEFAULT=NETS[id].locker;
  try{localStorage.setItem(NET_KEY,String(id));}catch(e){}
  const sel=el(`netSel`);if(sel)sel.value=String(id);
  el(`faddr`).value=FACTORY_DEFAULT;
  const ct=el(`consoleTitle`);if(ct)ct.textContent=`botlaunch console — live `+NETS[id].label+` `+id;
  const nf=el(`netFoot`);if(nf)nf.textContent=NETS[id].rpc.replace(`https://`,``)+` · `+NETS[id].label+` `+id;
  log(`network → BOT Chain `+NETS[id].label+` `+id);
  readGateState();readRecentLedger();updateRoleUI();
  if(account)el(`navState`).textContent=shorten(account)+` · `+NETS[id].label;
}

const FACTORY_ABI=[
`function owner() view returns (address)`,
`function gatekeeper() view returns (address)`,
`function v3factory() view returns (address)`,
`function positionManager() view returns (address)`,
`function verified(address) view returns (bool)`,
`function gatingEnabled() view returns (bool)`,
`function allTokens(uint256) view returns (address)`,
`function tokenCount() view returns (uint256)`,
`function tokenCreator(address) view returns (address)`,
`function supportedFee(uint24) view returns (bool)`,
`function createToken(string,string,uint256) returns (address)`,
`function ensurePool(address,address,uint24) returns (address)`,
`function setVerified(address,bool)`,
`function setGating(bool)`,
`function setFeeTier(uint24,bool)`,
`function proposeOwner(address)`,
`function acceptOwner()`,
`function proposeGatekeeper(address)`,
`function acceptGatekeeper()`,
];

const ERC20_ABI=[
  `function name() view returns (string)`,
  `function symbol() view returns (string)`,
  `function balanceOf(address) view returns (uint256)`,
  `function approve(address,uint256) returns (bool)`,
  `function transfer(address,uint256) returns (bool)`,
];

const LOCKER_ABI=[
  `function lockLiquidity(tuple address token,address base,uint24 fee,uint160 sqrtPriceX96,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,uint64 lockDuration,uint256 deadline) external returns (uint256 id,uint256 tokenId)`,
  `function withdraw(uint256 id) external`
];

let signer=null;
let account=null;

const PROJECT_ID=`f018499b1e4a94d961ab67aeeeff3254`;

const botTestnet={
  id:968,
  chainNamespace:`eip155`,
  caipNetworkId:`eip155:968`,
  name:`BOT Chain Testnet`,
  nativeCurrency:{name:`BOT`,symbol:`BOT`,decimals:18},
  rpcUrls:{default:{http:[`https://rpc.bohr.life`]}},
  blockExplorers:{default:{name:`BOT Scan`,url:`https://scan.bohr.life`}},
};
const botMainnet={
  id:677,
  chainNamespace:`eip155`,
  caipNetworkId:`eip155:677`,
  name:`BOT Chain`,
  nativeCurrency:{name:`BOT`,symbol:`BOT`,decimals:18},
  rpcUrls:{default:{http:[`https://rpc.botchain.ai`]}},
  blockExplorers:{default:{name:`BOT Scan`,url:`https://scan.botchain.ai`}},
};

const modal=createAppKit({
  adapters:[new EthersAdapter()],
  networks:[botTestnet,botMainnet],
  defaultNetwork:botTestnet,
  projectId:PROJECT_ID,
  metadata:{
    name:`BotLaunch`,
    description:`Gated token launches on BOT Chain`,
    url:`https://bot-launch-delta.vercel.app`,
    icons:[`https://bot-launch-delta.vercel.app/favicon.ico`],
  },
  themeVariables:{'--w3m-accent':`#bf3a1e`},
  features:{analytics:false},
});

let walletProvider=null;
let _connectResolve=null;

function getProvider(){
  if(walletProvider)return walletProvider;
  try{
    if(modal&&typeof modal.getWalletProvider===`function`){
      const p=modal.getWalletProvider(`eip155`)||modal.getWalletProvider();
      if(p){walletProvider=p;return p;}
    }
  }catch(e){}
  return null;
}

async function syncFromProvider(wp){
  let bp=new ethers.BrowserProvider(wp);
  const net=await bp.getNetwork();
  if(Number(net.chainId)!==CHAIN_ID){
    log(`switching to BOT Chain `+NETS[CHAIN_ID].label+`…`);
    await modal.switchNetwork(netObj(CHAIN_ID));
    bp=new ethers.BrowserProvider(getProvider()||wp);
  }
  signer=await bp.getSigner();
  account=await signer.getAddress();
}

function updateConnectedUI(){
  el(`navState`).textContent=shorten(account)+` · `+NETS[CHAIN_ID].label;
  el(`connectBtn`).textContent=`Connected`;
}
function updateDisconnectedUI(){
  el(`navState`).textContent=`read-only`;
  el(`connectBtn`).textContent=`Connect wallet`;
}

modal.subscribeProviders((state)=>{
  if(state&&state[`eip155`])walletProvider=state[`eip155`];
});

modal.subscribeAccount(async (state)=>{
  if(state&&state.isConnected&&state.address){
    account=state.address;
    const wp=getProvider();
    if(wp){
      try{
        await syncFromProvider(wp);
        updateConnectedUI();
        log(`connected `+account);
        updateRoleUI();
      }catch(e){log(`connect failed: `+(e.reason||e.shortMessage||e.message));}
    }else{
      updateConnectedUI();
      log(`connected `+account);
      updateRoleUI();
    }
    if(_connectResolve){_connectResolve(!!signer);_connectResolve=null;}
  }else{
    const was=!!account;
    account=null;signer=null;
    updateDisconnectedUI();
    updateRoleUI();
    if(was)log(`disconnected`);
    if(_connectResolve){_connectResolve(false);_connectResolve=null;}
  }
});

modal.subscribeState((state)=>{
  if(state&&state.open===false&&_connectResolve&&!signer){
    _connectResolve(false);_connectResolve=null;
  }
});

function onConnectClick(){
  let isConn=false;
  try{isConn=modal.getIsConnectedState();}catch(e){}
  if(isConn&&getProvider()){
    try{
      const r=modal.open({view:`Account`});
      if(r&&typeof r.catch===`function`)r.catch(()=>{try{modal.open();}catch(e){}});
    }catch(e){try{modal.open();}catch(_){}}
    return;
  }
  connect();
}

const TICKER_ITEMS=[
  `no tax, no clowns — the token is a plain ERC-20`,
  `listings blocked until the gatekeeper verifies your token`,
  `pool created on the audited V3 engine, LP stays yours`,
  `gate is a chain-of-custody signal — not advice, not yolo`,
  `two-key wall live — owner plus gatekeeper`,
  `sandbox mainnet boots first — harsher taxes included`,
];

function log(m){
  const el=document.getElementById(`log`);
  const d=document.createElement(`div`);
  d.textContent=m;
  el.appendChild(d);
  while(el.children.length>40)el.removeChild(el.firstChild);
  el.scrollTop=el.scrollHeight;
}

async function updateRoleUI(){
  const panel=el(`operator-panel`);
  const badge=el(`roleBadge`);
  if(!account){
    panel.style.display=`none`;
    if(badge)badge.style.display=`none`;
    return;
  }
  try{
    const v=factory();
    const [o,g]=await Promise.all([v.owner(),v.gatekeeper()]);
    const me=account.toLowerCase();
    const isOwner=me===o.toLowerCase();
    const isKeeper=me===g.toLowerCase();
    panel.style.display=(isOwner||isKeeper)?`block`:`none`;
    if(badge){
      badge.style.display=`inline-block`;
      badge.textContent=isOwner?`owner`:isKeeper?`gatekeeper`:`visitor`;
      el(`b_verify`).disabled=!isKeeper&&!isOwner;
      el(`b_gate`).disabled=!isOwner;
      el(`opNote`).textContent=isOwner?`owner: full control (gating + roles)`
        :isKeeper?`gatekeeper: verify only — gating switch is owner-only`
        :`connected as visitor — operator controls hidden (would revert on-chain)`;
    }
  }catch(e){ panel.style.display=`none`; }
}
function el(id){ return document.getElementById(id); }
function shorten(a){ return a ? a.slice(0,6)+`…`+a.slice(-4) : ``; }

function factory(){
  const a=el(`faddr`).value.trim()||FACTORY_DEFAULT;
  const p=signer||new ethers.JsonRpcProvider(RPC);
  return new ethers.Contract(a,FACTORY_ABI,p);
}
function erc20(a){
  const p=signer||new ethers.JsonRpcProvider(RPC);
  return new ethers.Contract(a,ERC20_ABI,p);
}
function locker(){
  const a=LOCKER_DEFAULT;
  const p=signer||new ethers.JsonRpcProvider(RPC);
  return new ethers.Contract(a,LOCKER_ABI,p);
}
async function connect(){
  try{
    if(modal.getIsConnectedState()){
      const wp=getProvider();
      if(wp){
        await syncFromProvider(wp);
        updateConnectedUI();
        log(`connected `+account);
        return true;
      }
    }
  }catch(e){}
  const pending=new Promise((resolve)=>{_connectResolve=resolve;});
  try{modal.open();}
  catch(e){
    _connectResolve=null;
    log(`connect failed: `+(e.message||e));
    return false;
  }
  const timeout=new Promise((resolve)=>setTimeout(()=>resolve(!!signer),120000));
  return Promise.race([pending,timeout]);
}

async function send(promise,label){
  try{
    const tx=await promise;
    log(label+` sent `+tx.hash);
    document.title=`⏳ `+label;
    const rc=await tx.wait();
    document.title=`BotLaunch — Clear the gate`;
    log(`✓ `+label+` confirmed`);
    return rc;
  }catch(e){
    document.title=`BotLaunch — Clear the gate`;
    log(`✗ `+label+` failed: `+(e.reason||e.shortMessage||(e.message||e).split(`\n`)[0]));
    return null;
  }
}

async function readGateState(){
  const a=el(`faddr`).value.trim()||FACTORY_DEFAULT;
  try{
    const p=new ethers.JsonRpcProvider(RPC);
    const v=new ethers.Contract(a,FACTORY_ABI,p);
    const on=await v.gatingEnabled();
    const [owner,keeper]=await Promise.all([v.owner(),v.gatekeeper()]);
    const eng=await v.v3factory();
    el(`ledgerGateState`).textContent=on?`gate clocked ON — enforced`:`gate off — open listings`;
    el(`gateState`).textContent=on?`gate: ENFORCED`:`gate: OPEN`;
    el(`kingGate`).textContent=on?`1/1`:`0/1 (open listings)`;
    el(`ledgerEngine`).textContent=shorten(eng);
    const kg=el(`keeperLine`);
    if(kg)kg.textContent=`owner ${shorten(owner)} · gatekeeper ${shorten(keeper)}`;
    log(`gate state: `+(on?`ENFORCED`:`OPEN`)+` · owner `+shorten(owner)+` · gatekeeper `+shorten(keeper)+` · V3 engine `+shorten(eng));
    updateRoleUI();
    return on;
  }catch(e){
    log(`read gate state failed: `+(e.shortMessage||e.message));
    return null;
  }
}

async function readTokenStatus(){
  const t=el(`vf_tok`).value.trim();
  const s=el(`vf_status`);
  if(!t || !/^0x[0-9a-fA-F]{40}$/.test(t)){
    s.textContent=`read-only: fill in a token to see its live gate status`;
    s.style.color=`var(--muted-dim)`;
    return;
  }
  try{
    const p=new ethers.JsonRpcProvider(RPC);
    const v=new ethers.Contract(el(`faddr`).value.trim()||FACTORY_DEFAULT,FACTORY_ABI,p);
    const on=await v.verified(t);
    s.textContent=on?`✓ verified — ${shorten(t)} clears the gate`:`✗ not verified — ensurePool will revert with NotVerified`;
    s.style.color=on?`var(--green)`:`var(--red)`;
  }catch(e){
    s.textContent=`could not read verified status`;
    s.style.color=`var(--muted-dim)`;
  }
}

async function doCreate(){
  const n=el(`tk_name`).value.trim();
  const s=el(`tk_symbol`).value.trim();
  const sup=ethers.parseEther(el(`tk_supply`).value||`0`);
  if(!n||!s){ log(`create: name and symbol required`); return; }
  const rc=await send(factory().createToken(n,s,sup),`createToken (${n} ${s})`);
  if(rc){
    const iface=new ethers.Interface(FACTORY_ABI);
    for(const l of rc.logs){
      try{
        const ev=iface.parseLog(l);
        if(ev && ev.name===`TokenCreated`){
          const tok=ev.args.token;
          el(`pool_tok`).value=tok;
          el(`mint_result`).style.display=`block`;
          el(`mint_result`).textContent=`token ${s} · ${tok}`;
          log(`✓ minted token at ${tok}`);
          readRecentLedger();
        }
      }catch(e){}
    }
  }
}

async function readRecentLedger(){
  const box=el(`ledgerRows`);
  if(!box)return;
  try{
    const p=new ethers.JsonRpcProvider(RPC);
    const v=new ethers.Contract(el(`faddr`).value.trim()||FACTORY_DEFAULT,FACTORY_ABI,p);
    const n=Number(await v.tokenCount());
    if(n===0){ box.innerHTML=`<div class="ledger-entry"><span class="tok">—</span><span class="meta">no tokens minted on this factory yet</span><span class="stamp-pill held">empty</span></div>`; return; }
    const ids=[];
    for(let i=Math.max(0,n-5);i<n;i++)ids.push(i);
    const rows=await Promise.all(ids.map(async (i)=>{
      const t=await v.allTokens(i);
      const [tok,isV,cr]=await Promise.all([
        erc20(t),
        v.verified(t),
        v.tokenCreator(t).catch(()=>`0x0000000000000000000000000000000000000000`),
      ]);
      let name=`?`,sym=`?`;
      try{ [name,sym]=await Promise.all([tok.name(),tok.symbol()]); }catch(e){}
      return {t,name,sym,isV,cr};
    }));
    rows.reverse();
    box.innerHTML=rows.map((r)=>
      `<div class="ledger-entry"><span class="tok">${r.sym}</span>`+
      `<span class="meta">${r.name} · minted by ${shorten(r.cr)}${r.isV?` · verified · pool live`:` · under review`}</span>`+
      `<span class="stamp-pill ${r.isV?`cleared`:`held`}">${r.isV?`cleared`:`held`}</span></div>`
    ).join(``);
  }catch(e){
    box.innerHTML=`<div class="ledger-entry"><span class="tok">—</span><span class="meta">could not read registry</span><span class="stamp-pill held">offline</span></div>`;
  }
}

async function doPool(){
  const t=el(`pool_tok`).value.trim();
  const b=el(`pool_base`).value.trim();
  const fee=Number(el(`pool_fee`).value);
  if(!t||!b){ log(`pool: token and base required`); return; }
  try{
    if(!await factory().supportedFee(fee)){ log(`pool: fee tier ${fee} not supported by this factory — tx would revert BadFeeTier`); return; }
  }catch(e){}
  const rc=await send(factory().ensurePool(t,b,fee),`ensurePool (${shorten(t)})`);
  if(rc){
    const iface=new ethers.Interface(FACTORY_ABI);
    for(const l of rc.logs){
      try{
        const ev=iface.parseLog(l);
        if(ev && ev.name===`PoolReady`){
          log(`✓ pool ${ev.args.pool} on fee tier ${Number(ev.args.fee)}`);
        }
      }catch(e){}
    }
  }
}

async function doVerify(){
  const t=el(`vf_tok`).value.trim();
  const on=el(`vf_on`).value===`true`;
  if(!t){ log(`verify: token required`); return; }
  await send(factory().setVerified(t,on),`setVerified(${shorten(t)},${on})`);
  readGateState();
  readTokenStatus();
}

async function doGate(){
  const on=el(`gt_on`).value===`true`;
  await send(factory().setGating(on),`setGating(${on})`);
  readGateState();
}

async function doLock() {
  const t = el(`lock_token`).value.trim();
  const b = el(`lock_base`).value.trim();
  const f = Number(el(`lock_fee`).value);
  const a0 = el(`lock_amount0`).value.trim();
  const a1 = el(`lock_amount1`).value.trim();
  const d = el(`lock_duration`).value.trim();
  if (!t || !b || !a0 || !a1 || !d) { log(`lock: token, base, amounts, duration required`); return; }
  if (!/^0x[0-9a-fA-F]{40}$/.test(t) || !/^0x[0-9a-fA-F]{40}$/.test(b)) { log(`lock: invalid address`); return; }
  const A0 = ethers.parseEther(a0);
  const A1 = ethers.parseEther(a1);
  const dur = Number(d);
  if (isNaN(dur) || dur <= 0) { log(`lock: invalid duration`); return; }
  const tokC = erc20(t);
  const baseC = erc20(b);
  const lockerAddr = LOCKER_DEFAULT;
  await send(tokC.approve(lockerAddr, A0), `approve token`);
  await send(baseC.approve(lockerAddr, A1), `approve base`);
  const provider = signer || new ethers.JsonRpcProvider(RPC);
  const blk = await provider.getBlock();
  const deadline = BigInt(blk.timestamp) + BigInt(dur) + BigInt(60);
  const Q96 = 2n ** 96n;
  const sqrtP = Q96;
  const tickL = -600;
  const tickU = 600;
  const min0 = 0n;
  const min1 = 0n;
  const lockerC = locker();
  const rc = await send(
    lockerC.lockLiquidity([
      t, b, f, sqrtP, tickL, tickU, A0, A1, min0, min1, BigInt(dur), deadline
    ], `lockLiquidity`),
    `lock liquidity`
  );
  if (rc) {
    const iface = new ethers.Interface(LOCKER_ABI);
    for (const l of rc.logs) {
      try {
        const ev = iface.parseLog(l);
        if (ev && ev.name === `LockCreated`) {
          log(`✓ lock id=${ev.args.id} tokenId=${ev.args.tokenId}`);
          el(`lock_result`).textContent = `locked id=${ev.args.id} tokenId=${ev.args.tokenId}`;
        }
      } catch (_) {}
    }
  }
}
async function doWithdraw() {
  const idS = el(`lock_withdraw_id`).value.trim();
  if (!idS) { log(`withdraw: ID required`); return; }
  const id = BigInt(idS);
  await send(locker().withdraw(id), `withdraw(${id})`);
  el(`lock_result`).textContent = `withdrawn lock ID ${id}`;
}

function buildTicker(){
  const track=el(`tickerTrack`);
  const half=TICKER_ITEMS.map(t=>`<span>→ ${t}</span>`).join(``);
  track.innerHTML=half+half; 
}

document.addEventListener(`DOMContentLoaded`,()=>{
  el(`faddr`).value=FACTORY_DEFAULT;
  const sel=el(`netSel`);if(sel){sel.value=String(CHAIN_ID);sel.addEventListener(`change`,()=>applyNet(Number(sel.value)));}
  buildTicker();
  el(`connectBtn`).addEventListener(`click`,onConnectClick);
  el(`b_create`).addEventListener(`click`,doCreate);
  el(`b_pool`).addEventListener(`click`,doPool);
  el(`b_verify`).addEventListener(`click`,doVerify);
  el(`b_gate`).addEventListener(`click`,doGate);
  el(`b_lock`).addEventListener(`click`,doLock);
el(`b_withdraw`).addEventListener(`click`,doWithdraw);
el(`clearLog`).addEventListener(`click`,(e)=>{ e.preventDefault(); el(`log`).innerHTML=``; });
  el(`faddr`).addEventListener(`change`,()=>{ readGateState(); readRecentLedger(); updateRoleUI(); });
  el(`vf_tok`).addEventListener(`change`,readTokenStatus);
  readGateState();
  readTokenStatus();
  readRecentLedger();
  updateRoleUI();
  setTimeout(async ()=>{
    try{
      if(!signer&&modal.getIsConnectedState()){
        const wp=getProvider();
        if(wp){
          await syncFromProvider(wp);
          updateConnectedUI();
          log(`session restored `+account);
        }
      }
    }catch(e){}
  },800);
});