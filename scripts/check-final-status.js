const hre = require("hardhat");

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const TASK_ID = "0x9aeae667e8a0b99e1be192909e7f67694330e3f96d89c46e3adc258cd49eb0a9";
  const REPORT_TX = "0x5643abff46594137a94ae9c3728855b76ba97005a81c52191d1096ae67a7a503";
  
  console.log('\n🔍 Final Status Check\n');
  console.log('='.repeat(70));
  
  const [signer] = await hre.ethers.getSigners();
  
  // Check our contract
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const attemptCount = await app.callbackAttemptCount();
  const processed = await app.processedTasks(TASK_ID);
  
  console.log('Our Contract:');
  console.log('  Callback Attempts:', attemptCount.toString());
  console.log('  Task Processed:', processed);
  
  if (attemptCount.gt(0)) {
    for (let i = 0; i < Math.min(attemptCount.toNumber(), 3); i++) {
      const attempt = await app.getCallbackAttempt(i);
      console.log(`  Attempt ${i}: success=${attempt.success}, data=${attempt.data}`);
    }
  }
  console.log('');
  
  // Check Primus task
  const task = new hre.ethers.Contract(PRIMUS, [
    "function queryTask(bytes32) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], signer);
  
  const taskInfo = await task.queryTask(TASK_ID);
  console.log('Primus Task:');
  console.log('  Status:', ['INIT', 'SUCCESS', 'PARTIAL_SUCCESS', 'PARTIAL_SUCCESS_SETTLED', 'FAILED'][taskInfo.taskStatus]);
  console.log('  Callback:', taskInfo.callback);
  console.log('  Results:', taskInfo.taskResults.length);
  console.log('');
  
  // Check report tx
  const receipt = await hre.ethers.provider.getTransactionReceipt(REPORT_TX);
  if (receipt) {
    console.log('Report Transaction:');
    console.log('  Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
    console.log('  Gas Used:', receipt.gasUsed.toString());
    console.log('  Logs:', receipt.logs.length);
  } else {
    console.log('Report Transaction: Still pending/not found');
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (processed) {
    console.log('✅✅✅ SUCCESS! ✅✅✅');
  } else {
    console.log('⏳ Not processed yet');
  }
}

main().catch(console.error);
