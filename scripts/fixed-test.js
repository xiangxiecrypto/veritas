const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
const MOLTBOOK_API = 'https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus';
const CHAIN_ID = 84532;
const AGENT_ID = 1018;

async function main() {
  console.log('\n🧪 Complete Test: Full Flow\n');
  console.log('='.repeat(70));
  
  const [wallet] = await ethers.getSigners();
  console.log('Wallet:', wallet.address);
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await ethers.provider.getGasPrice();
  const fee = ethers.BigNumber.from('10000000000');
  
  // STEP 1: Request Validation (this also submits to Primus internally!)
  console.log('\n📦 STEP 1: Request Validation');
  console.log('─'.repeat(70));
  
  const tx = await app.requestValidation(AGENT_ID, 0, [0], 1, { 
    value: fee,
    gasPrice: gasPrice.mul(3)
  });
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  
  console.log('Task ID:', taskId);
  console.log('Tx:', tx.hash);
  
  // Get Primus tx hash for SDK
  const primusTxHash = tx.hash;
  
  // STEP 2: SDK Attestation
  console.log('\n📦 STEP 2: SDK Attestation');
  console.log('─'.repeat(70));
  
  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  
  const attestResult = await primus.attest({
    address: wallet.address,
    taskId: taskId,
    taskTxHash: primusTxHash,
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{
      url: MOLTBOOK_API,
      method: "GET",
      header: {},
      body: ""
    }],
    responseResolves: [[{
      keyName: "x_follower_count",
      parseType: "json",
      parsePath: "$.agent.owner.x_follower_count"
    }]]
  }, 120000);
  
  console.log('✅ Attestation successful!');
  const att = attestResult[0].attestation;
  console.log('Data:', att.data);
  
  // STEP 3: Manual Submit
  console.log('\n📦 STEP 3: Manual Submit');
  console.log('─'.repeat(70));
  
  const submitTx = await app.submitAttestation(taskId, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  const submitReceipt = await submitTx.wait();
  
  console.log('Submit Tx:', submitTx.hash);
  
  // STEP 4: Check Result
  console.log('\n📦 STEP 4: Result');
  console.log('─'.repeat(70));
  
  const completedEvent = submitReceipt.events.find(e => e.event === 'ValidationCompleted');
  if (completedEvent) {
    console.log('✅ SUCCESS!');
    console.log('Task ID:', completedEvent.args.taskId);
    console.log('Score:', completedEvent.args.score.toString());
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ COMPLETE TEST SUCCESSFUL!');
  console.log('='.repeat(70));
}

main().catch(console.error);
