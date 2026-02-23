const hre = require("hardhat");

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const TASK_ID = "0xa7256415108892d69d9eace037673d3dc135d0e454136c24e75c477bf9d09d54";
  const REPORT_TX = "0x7ff803082e65c746063c3a9c8715b8f329a81662a616e58660b634e01395bd9e";
  
  console.log('\n🔍 Checking Callback Status (After Gas Increase)\n');
  console.log('='.repeat(70));
  console.log('Task ID:', TASK_ID);
  console.log('Report Tx:', REPORT_TX);
  console.log('');
  
  const [signer] = await hre.ethers.getSigners();
  
  // Check Primus task
  const task = new hre.ethers.Contract(PRIMUS, [
    "function queryTask(bytes32) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], signer);
  
  const taskInfo = await task.queryTask(TASK_ID);
  console.log('📋 Primus Task:');
  console.log('  Status:', ['INIT', 'SUCCESS', 'PARTIAL_SUCCESS', 'PARTIAL_SUCCESS_SETTLED', 'FAILED'][taskInfo.taskStatus]);
  console.log('  Callback:', taskInfo.callback);
  console.log('  Results:', taskInfo.taskResults.length);
  console.log('');
  
  // Check our contract
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const attemptCount = await app.callbackAttemptCount();
  console.log('📋 Our Contract:');
  console.log('  Callback Attempts:', attemptCount.toString());
  
  if (attemptCount.gt(0)) {
    for (let i = 0; i < attemptCount.toNumber() && i < 3; i++) {
      const attempt = await app.getCallbackAttempt(i);
      console.log(`  Attempt ${i}:`);
      console.log('    Task ID:', attempt.taskId);
      console.log('    Data:', attempt.data);
      console.log('    Success:', attempt.success);
    }
  }
  
  const processed = await app.processedTasks(TASK_ID);
  console.log('  Task Processed:', processed);
  console.log('');
  
  // Check for events
  console.log('📋 Events:');
  const filter = app.filters.ValidationCompleted(TASK_ID);
  const events = await app.queryFilter(filter);
  console.log('  ValidationCompleted events:', events.length);
  
  if (events.length > 0) {
    console.log('  ✅ Score:', events[0].args.score.toString(), '/ 100');
  }
  console.log('');
  
  // Check report transaction
  console.log('📋 Report Transaction:');
  const receipt = await hre.ethers.provider.getTransactionReceipt(REPORT_TX);
  if (receipt) {
    console.log('  Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
    console.log('  Gas Used:', receipt.gasUsed.toString());
    console.log('  Logs:', receipt.logs.length);
  }
  
  console.log('\n' + '='.repeat(70));
  if (processed) {
    console.log('✅✅✅ SUCCESS! Callback worked! ✅✅✅');
  } else if (attemptCount.gt(0)) {
    console.log('⚠️ Callback received but not fully processed');
  } else {
    console.log('⏳ No callback yet - may still be pending');
  }
}

main().catch(console.error);
