const hre = require("hardhat");
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const AGENT_ID = 1018;
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🧪 Fresh Task Test - Checking Callback Gas\n');
  console.log('='.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Pay enough for 1M gas
  const gasPrice = await hre.ethers.provider.getGasPrice();
  const totalFee = gasPrice.mul(1000000); // 1M gas
  
  console.log('Fee to pay:', hre.ethers.utils.formatEther(totalFee), 'ETH');
  console.log('');
  
  // Step 1: Request validation
  console.log('📦 Step 1: Request Validation');
  console.log('─'.repeat(70));
  
  const tx = await app.requestValidation(AGENT_ID, 0, [0], 1, { value: totalFee });
  const receipt = await tx.wait();
  console.log('✅ Tx:', tx.hash);
  console.log('   Block:', receipt.blockNumber);
  
  // Get taskId
  const iface = new hre.ethers.utils.Interface(["event ValidationRequested(bytes32 indexed taskId, uint256 indexed ruleId, uint256 indexed agentId)"]);
  let taskId;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === 'ValidationRequested') taskId = parsed.args.taskId;
    } catch (e) {}
  }
  console.log('   Task ID:', taskId);
  console.log('');
  
  // Step 2: Check callback address in task
  console.log('🔍 Step 2: Check Task Info');
  console.log('─'.repeat(70));
  
  const task = new hre.ethers.Contract(PRIMUS, [
    "function queryTask(bytes32) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], signer);
  
  const taskInfo = await task.queryTask(taskId);
  console.log('Callback Address:', taskInfo.callback);
  console.log('Expected:', APP);
  console.log('Match:', taskInfo.callback.toLowerCase() === APP.toLowerCase() ? '✅ YES' : '❌ NO');
  console.log('');
  
  // Step 3: SDK Attestation
  console.log('🔐 Step 3: Primus SDK Attestation');
  console.log('─'.repeat(70));
  
  const primus = new PrimusNetwork();
  await primus.init(signer, 84532);
  
  const result = await primus.attest({
    address: signer.address,
    userAddress: signer.address,
    taskId: taskId,
    taskTxHash: tx.hash,
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{
      url: 'https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus',
      method: 'GET',
      header: '',
      body: ''
    }],
    responseResolves: [[{
      keyName: 'followers',
      parseType: 'json',
      parsePath: '$.agent.owner.x_follower_count'
    }]]
  }, 120000);
  
  const reportTxHash = result[0].reportTxHash;
  console.log('✅ Attestation:', result[0].attestation.data);
  console.log('   reportTxHash:', reportTxHash);
  console.log('');
  
  // Step 4: Wait and check report tx
  console.log('⏳ Step 4: Waiting for transaction to confirm...');
  console.log('─'.repeat(70));
  
  await new Promise(r => setTimeout(r, 10000));
  
  const reportReceipt = await hre.ethers.provider.getTransactionReceipt(reportTxHash);
  
  if (reportReceipt) {
    console.log('Report Tx Status:', reportReceipt.status === 1 ? '✅ Success' : '❌ Failed');
    console.log('Gas Used:', reportReceipt.gasUsed.toString());
    console.log('Logs:', reportReceipt.logs.length);
    console.log('');
    
    // Check our contract
    const attemptCount = await app.callbackAttemptCount();
    const processed = await app.processedTasks(taskId);
    
    console.log('Our Contract:');
    console.log('  Callback Attempts:', attemptCount.toString());
    console.log('  Task Processed:', processed);
    console.log('');
    
    if (processed) {
      console.log('✅✅✅ SUCCESS! Callback worked! ✅✅✅');
    } else {
      console.log('❌ Still not processed');
      console.log('');
      console.log('Check internal transactions at:');
      console.log('  https://sepolia.basescan.org/tx/' + reportTxHash + '#internal');
    }
  } else {
    console.log('⏳ Transaction still pending...');
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
