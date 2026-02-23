const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
const MOLTBOOK_API = 'https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus';
const CHAIN_ID = 84532;
const AGENT_ID = 1018;

async function main() {
  console.log('\n🧪 Fresh Test with Debug\n');
  
  const [wallet] = await ethers.getSigners();
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await ethers.provider.getGasPrice();
  const fee = ethers.BigNumber.from('10000000000');
  
  // Request validation
  console.log('Step 1: Requesting...');
  const tx = await app.requestValidation(AGENT_ID, 0, [0], 1, { 
    value: fee,
    gasPrice: gasPrice.mul(3)
  });
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  console.log('Task ID:', taskId);
  
  // SDK Attestation
  console.log('\nStep 2: SDK Attestation...');
  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  
  const result = await primus.attest({
    address: wallet.address,
    taskId: taskId,
    taskTxHash: tx.hash,
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{ url: MOLTBOOK_API, method: "GET", header: {}, body: "" }],
    responseResolves: [[{
      keyName: "x_follower_count",
      parseType: "json",
      parsePath: "$.agent.owner.x_follower_count"
    }]]
  }, 120000);
  
  const att = result[0].attestation;
  
  console.log('\n📊 ATTESTATION DATA:');
  console.log('request (hex):', ethers.utils.hexlify(att.request));
  console.log('responseResolve (hex):', ethers.utils.hexlify(att.responseResolve));
  console.log('data:', att.data);
  console.log('timestamp:', att.timestamp);
  
  console.log('\n📊 DECODED REQUEST:');
  console.log(ethers.utils.toUtf8String(att.request));
}

main().catch(console.error);
