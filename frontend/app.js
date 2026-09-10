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

function log(m){
  const el=document.getElementById(`log`);
  el.textContent+=m+`\n`;
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
  log(`connected `+account);
}
function factory(){
  const a=document.getElementById(`faddr`).value||FACTORY_DEFAULT;
  const p=signer||new ethers.JsonRpcProvider(RPC);
  return new ethers.Contract(a,FACTORY_ABI,p);
}
function erc20(a){
  const p=signer||new ethers.JsonRpcProvider(RPC);
  return new ethers.Contract(a,ERC20_ABI,p);
}
async function send(promise,label){
  try{
    const tx=await promise;
    log(label+` sent `+tx.hash);
    await tx.wait();
    log(label+` confirmed`);
    return tx;
  }catch(e){
    log(label+` failed `+(e.reason||e.shortMessage||e.message||e));
    return null;
  }
}
async function doCreate(){
  const v=factory();
  const n=document.getElementById(`tk_name`).value;
  const s=document.getElementById(`tk_symbol`).value;
  const sup=ethers.parseEther(document.getElementById(`tk_supply`).value||`0`);
  const tx=await send(v.createToken(n,s,sup),`createToken`);
  if(tx){
    const rc=await tx.wait();
    const ev=rc.logs.map((l)=>{try{v.interface.parseLog(l)}catch(e){return null}}).filter(Boolean);
    const cev=ev.find((x)=>x.name===`TokenCreated`);
    if(cev)document.getElementById(`mint_addr`).value=cev.args.token;
  }
}
async function doPool(){
  const v=factory();
  const t=document.getElementById(`pool_tok`).value;
  const b=document.getElementById(`pool_base`).value;
  const fee=Number(document.getElementById(`pool_fee`).value);
  await send(v.ensurePool(t,b,fee),`ensurePool`);
}
async function doApprove(){
  const t=document.getElementById(`tok_addr`).value;
  const s=document.getElementById(`tok_spend`).value;
  const amt=ethers.parseEther(document.getElementById(`tok_amt`).value||`0`);
  await send(erc20(t).approve(s,amt),`approve`);
}
async function doBal(){
  if(!account){ log(`connect wallet first to read your balance`); return; }
  const t=document.getElementById(`tok_addr`).value;
  const e=erc20(t);
  log(`name `+await e.name()+` symbol `+await e.symbol());
  log(`balance `+ethers.formatEther(await e.balanceOf(account)));
}
async function doRead(){
  const v=factory();
  log(`owner `+await v.owner());
  log(`v3factory `+await v.v3factory());
  log(`positionManager `+await v.positionManager());
  log(`gatingEnabled `+await v.gatingEnabled());
}
async function doVerify(){
  const v=factory();
  const t=document.getElementById(`vf_tok`).value;
  const on=document.getElementById(`vf_on`).value===`true`;
  await send(v.setVerified(t,on),`setVerified`);
}
async function doGate(){
  const v=factory();
  const on=document.getElementById(`gt_on`).value===`true`;
  await send(v.setGating(on),`setGating`);
}
document.getElementById(`b_connect`).addEventListener(`click`,connect);
document.getElementById(`b_create`).addEventListener(`click`,doCreate);
document.getElementById(`b_pool`).addEventListener(`click`,doPool);
document.getElementById(`b_approve`).addEventListener(`click`,doApprove);
document.getElementById(`b_bal`).addEventListener(`click`,doBal);
document.getElementById(`b_read`).addEventListener(`click`,doRead);
document.getElementById(`b_verify`).addEventListener(`click`,doVerify);
document.getElementById(`b_gate`).addEventListener(`click`,doGate);