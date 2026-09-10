const FACTORY_DEFAULT=`0xbB8BEd358538119EfEB72cCf1231EAD30985074A`;
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
  if(!window.ethereum){ log(`no wallet found, use MetaMask`); return; }
  const accs=await window.ethereum.request({method:`eth_requestAccounts`});
  account=accs[0];
  try{
    await window.ethereum.request({method:`wallet_switchEthereumChain`,params:[{chainId:`0x3c8`}]});
  }catch(e){
    await window.ethereum.request({method:`wallet_addEthereumChain`,params:[{chainId:`0x3c8`,chainName:`BOT Chain Testnet`,nativeCurrency:{name:`BOT`,symbol:`BOT`,decimals:18},rpcUrls:[RPC],blockExplorerUrls:[EXPLORER]}]});
  }
  signer=await new ethers.BrowserProvider(window.ethereum).getSigner();
  el(`navState`).textContent=shorten(account)+` · testnet`;
  el(`connectBtn`).textContent=`Connected`;
  log(`connected `+account);
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
  el(`connectBtn`).addEventListener(`click`,connect);
  el(`b_create`).addEventListener(`click`,doCreate);
  el(`b_pool`).addEventListener(`click`,doPool);
  el(`b_verify`).addEventListener(`click`,doVerify);
  el(`b_gate`).addEventListener(`click`,doGate);
  el(`clearLog`).addEventListener(`click`,(e)=>{ e.preventDefault(); el(`log`).innerHTML=``; });
  el(`faddr`).addEventListener(`change`,readGateState);
  el(`vf_tok`).addEventListener(`change`,readTokenStatus);
  readGateState();
  readTokenStatus();
});