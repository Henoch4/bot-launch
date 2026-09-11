import * as ethers from 'ethers';
import { createAppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';

const FACTORY_DEFAULT=`0xA27963D86F6805ED72591d59c58fed96F4fd9c81`;
const RPC=`https://rpc.bohr.life`;
const EXPLORER=`https://scan.bohr.life`;

const FACTORY_ABI=[
`function owner() view returns (address)`,
`function v3factory() view returns (address)`,
`function positionManager() view returns (address)`,
`function verified(address) view returns (bool)`,
`function gatingEnabled() view returns (bool)`,
`function createToken(string,string,uint256) returns (address)`,
`function ensurePool(address,address,uint24) returns (address)`,
`function setVerified(address,bool)`,
`function setGating(bool)`,
];

const ERC20_ABI=[
`function name() view returns (string)`,
`function symbol() view returns (string)`,
`function balanceOf(address) view returns (uint256)`,
`function approve(address,uint256) returns (bool)`,
`function transfer(address,uint256) returns (bool)`,
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
  rpcUrls:{default:{http:[RPC]}},
  blockExplorers:{default:{name:`BOT Scan`,url:EXPLORER}},
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
  if(Number(net.chainId)!==968){
    log(`switching to BOT Chain testnet…`);
    await modal.switchNetwork(botTestnet);
    bp=new ethers.BrowserProvider(getProvider()||wp);
  }
  signer=await bp.getSigner();
  account=await signer.getAddress();
}

function updateConnectedUI(){
  el(`navState`).textContent=shorten(account)+` · testnet`;
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
      }catch(e){log(`connect failed: `+(e.reason||e.shortMessage||e.message));}
    }else{
      updateConnectedUI();
      log(`connected `+account);
    }
    if(_connectResolve){_connectResolve(!!signer);_connectResolve=null;}
  }else{
    const was=!!account;
    account=null;signer=null;
    updateDisconnectedUI();
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
  `two-key wall coming next`,
  `sandbox mainnet boots first — harsher taxes included`,
];

function log(m){
  const el=document.getElementById(`log`);
  const d=document.createElement(`div`);
  d.textContent=m;
  el.appendChild(d);
  el.scrollTop=el.scrollHeight;
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
    const owner=await v.owner();
    const eng=await v.v3factory();
    el(`ledgerGateState`).textContent=on?`gate clocked ON — enforced`:`gate off — open listings`;
    el(`gateState`).textContent=on?`gate: ENFORCED`:`gate: OPEN`;
    el(`kingGate`).textContent=on?`1/1`:`0/1 (open listings)`;
    el(`ledgerEngine`).textContent=shorten(eng);
    log(`gate state: `+(on?`ENFORCED`:`OPEN`)+` · owner `+shorten(owner)+` · V3 engine `+shorten(eng));
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
        }
      }catch(e){}
    }
  }
}

async function doPool(){
  const t=el(`pool_tok`).value.trim();
  const b=el(`pool_base`).value.trim();
  const fee=Number(el(`pool_fee`).value);
  if(!t||!b){ log(`pool: token and base required`); return; }
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

function buildTicker(){
  const track=el(`tickerTrack`);
  const half=TICKER_ITEMS.map(t=>`<span>→ ${t}</span>`).join(``);
  track.innerHTML=half+half; 
}

document.addEventListener(`DOMContentLoaded`,()=>{
  el(`faddr`).value=FACTORY_DEFAULT;
  buildTicker();
  el(`connectBtn`).addEventListener(`click`,onConnectClick);
  el(`b_create`).addEventListener(`click`,doCreate);
  el(`b_pool`).addEventListener(`click`,doPool);
  el(`b_verify`).addEventListener(`click`,doVerify);
  el(`b_gate`).addEventListener(`click`,doGate);
  el(`clearLog`).addEventListener(`click`,(e)=>{ e.preventDefault(); el(`log`).innerHTML=``; });
  el(`faddr`).addEventListener(`change`,readGateState);
  el(`vf_tok`).addEventListener(`change`,readTokenStatus);
  readGateState();
  readTokenStatus();
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