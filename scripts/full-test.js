const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const MOLTBOOK_API = 'https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus';
const CHAIN_ID = 84532;
const AGENT_ID = 1018;

const TASK_ABI = [
  "function queryLatestFeeInfo(uint8) view returns (tuple(uint256 primusFee, uint256 attestorFee))",
  "function submitTask(address,string,uint256,uint8,address) payable returns (bytes32)",
  "event TaskSubmitted(bytes32 indexed taskId, address indexed sender, string templateId, address[] attestors, uint64 submittedAt, uint8 tokenSymbol)"
];

async function main() {
  console.log('\n🧪 Complete Test: Full Flow\n');
  console.log('='.repeat(70));
  
  const [wallet] = await ethers.getSigners();
  console.log('Wallet:', wallet.address);
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // STEP 1: Request Validation
  console.log('\n📦 STEP 1: Request Validation');
  console.log('─'.repeat(70));
  
  const gasPrice = await ethers.provider.getGasPrice();
  const fee = ethers.BigNumber.from('10000000000');
  
  const tx = await app.requestValidation(AGENT_ID, 0, [0], 1, { 
    value: fee,
    gasPrice: gasPrice.mul(3)
  });
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  
  console.log('Task ID:', taskId);
  console.log('Tx:', tx.hash);
  console.log('Block:', receipt.blockNumber);
  
  // STEP 2: Submit Task to Primus
  console.log('\n📦 STEP 2: Submit Task to Primus');
  console.log('─'.repeat(70));
  
  const taskContract = new ethers.Contract(PRIMUS_TASK, TASK_ABI, wallet);
  
  const feeInfo = await taskContract.queryLatestFeeInfo(0);
  const totalFee = feeInfo.primusFee.add(feeInfo.attestorFee);
  console.log('Fee:', ethers.utils.formatEther(totalFee), 'ETH');
  
  const primusTx = await taskContract.submitTask(
    wallet.address,
    MOLTBOOK_API,
    1,
    0,
    ethers.constants.AddressZero,
    { value: totalFee, gasPrice: gasPrice.mul(3) }
  );
  
  console.log('Primus Tx:', primusTx.hash);
  const primusReceipt = await primusTx.wait();
  console.log('Primus Block:', primusReceipt.blockNumber);
  
  // Parse taskId from Primus
  const iface = new ethers.utils.Interface(TASK_ABI);
  let primusTaskId;
  
  for (const log of primusReceipt.logs) {
    if (log.address.toLowerCase() === PRIMUS_TASK.toLowerCase()) {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed.name === 'TaskSubmitted') {
          primusTaskId = parsed.args.taskId;
          console.log('Primus Task ID:', primusTaskId);
          break;
        }
      } catch (e) {
        const taskIdHex = '0x' + log.data.slice(2, 66);
        primusTaskId = taskIdHex;
        console.log('Primus Task ID (manual):', primusTaskId);
        break;
      }
    }
  }
  
  // STEP 3: SDK Attestation
  console.log('\n📦 STEP 3: SDK Attestation');
  console.log('─'.repeat(70));
  
  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  
  try {
    const attestResult = await primus.attest({
      address: wallet.address,
      taskId: primusTaskId,
      taskTxHash: primusTx.hash,
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
    console.log('Timestamp:', att.timestamp);
    
    // STEP 4: Manual Submit
    console.log('\n📦 STEP 4: Manual Submit');
    console.log('─'.repeat(70));
    
    const submitTx = await app.submitAttestation(taskId, {
      gasPrice: gasPrice.mul(3)
    });
    const submitReceipt = await submitTx.wait();
    
    console.log('Submit Tx:', submitTx.hash);
    
    // STEP 5: Check Result
    console.log('\n📦 STEP 5: Check Result');
    console.log('─'.repeat(70));
    
    const completedEvent = submitReceipt.events.find(e => e.event === 'ValidationCompleted');
    if (completedEvent) {
      console.log('✅ Validation Completed!');
      console.log('Task ID:', completedEvent.args.taskId);
      console.log('Score:', completedEvent.args.score.toString());
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE TEST SUCCESSFUL!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.log('❌ SDK Error:', error.message);
    console.log('\nTask IDs for manual test:');
    console.log('App Task ID:', taskId);
    console.log('Primus Task ID:', primusTaskId);
  }
}

main().catch(console.error);
