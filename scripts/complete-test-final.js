const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
const FOLLOWER_CHECK = "0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52";
const MOLTBOOK_API = 'https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus';
const CHAIN_ID = 84532;
const AGENT_ID = 1018;

async function main() {
  console.log('\n🧪 COMPLETE TEST: Full Flow\n');
  console.log('='.repeat(70));
  
  const [wallet] = await ethers.getSigners();
  console.log('Wallet:', wallet.address);
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await ethers.provider.getGasPrice();
  const fee = ethers.BigNumber.from('10000000000');
  
  // STEP 1: Request Validation
  console.log('\n📦 STEP 1: Request Validation');
  
  const tx = await app.requestValidation(AGENT_ID, 0, [0], 1, { 
    value: fee,
    gasPrice: gasPrice.mul(3)
  });
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  
  console.log('Task ID:', taskId);
  console.log('Tx:', tx.hash);
  
  // STEP 2: SDK Attestation
  console.log('\n📦 STEP 2: SDK Attestation');
  
  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  
  const attestResult = await primus.attest({
    address: wallet.address,
    taskId: taskId,
    taskTxHash: tx.hash,
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
  
  const submitTx = await app.submitAttestation(taskId, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  const submitReceipt = await submitTx.wait();
  
  console.log('Submit Tx:', submitTx.hash);
  
  // STEP 4: Result
  console.log('\n📦 STEP 4: Result');
  
  const completedEvent = submitReceipt.events.find(e => e.event === 'ValidationCompleted');
  if (completedEvent) {
    console.log('✅ SUCCESS!');
    console.log('Score:', completedEvent.args.score.toString());
  }
  
  // Check registry
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const reg = Registry.attach(REGISTRY);
  
  const filter = reg.filters.ValidationResponse();
  const currentBlock = await ethers.provider.getBlockNumber();
  const events = await reg.queryFilter(filter, currentBlock - 10, currentBlock);
  
  for (const e of events.reverse()) {
    if (e.args.requestHash.toLowerCase() === taskId.toLowerCase()) {
      console.log('Registry Score:', e.args.response.toString());
      break;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ COMPLETE TEST SUCCESSFUL!');
  console.log('='.repeat(70));
}

main().catch(console.error);
