const hre = require("hardhat");
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

async function main() {
  const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const AGENT_ID = 1018;
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🧪 Complete Test: Manual Submission\n');
  console.log('='.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Step 1: Request validation
  console.log('\n📦 Step 1: Requesting validation...');
  const fee = hre.ethers.BigNumber.from('10000000000');
  const gasPrice = await hre.ethers.provider.getGasPrice();
  
  const tx = await app.requestValidation(AGENT_ID, 0, [0], 1, { 
    value: fee,
    gasPrice: gasPrice.mul(3)
  });
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  
  console.log('   Task ID:', taskId);
  console.log('   Tx:', tx.hash);
  
  // Step 2: SDK Attestation
  console.log('\n📦 Step 2: Running SDK attestation...');
  
  const primus = new PrimusNetwork();
  await primus.init(signer, 84532);
  
  try {
    const attestResult = await primus.attest({
      taskId: taskId,
      taskTxHash: tx.hash,
      taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
      requests: [{
        url: 'https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus',
        method: 'GET'
      }],
      responseResolves: [[{
        keyName: 'x_followers',
        parsePath: '$.agent.owner.x_follower_count'
      }]]
    }, 120000);
    
    console.log('   Attestation successful!');
    console.log('   Data:', JSON.stringify(attestResult, null, 2));
    
    // Step 3: Manual submission
    console.log('\n📦 Step 3: Manual submission...');
    
    const submitTx = await app.submitAttestation(taskId, {
      gasPrice: gasPrice.mul(3)
    });
    const submitReceipt = await submitTx.wait();
    
    console.log('   Submitted:', submitTx.hash);
    
    // Step 4: Check result
    console.log('\n📦 Step 4: Checking result...');
    
    const completedEvent = submitReceipt.events.find(e => e.event === 'ValidationCompleted');
    if (completedEvent) {
      console.log('   ✅ Score:', completedEvent.args.score.toString());
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Complete Test Successful!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.log('   ❌ SDK Error:', error.message);
    console.log('\n   You need to run SDK attestation manually on your machine.');
    console.log('   Task ID:', taskId);
    console.log('   Tx Hash:', tx.hash);
  }
}

main().catch(console.error);
