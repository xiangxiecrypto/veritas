// Check callback status for the corrected flow deployment
const hre = require("hardhat");
const { ethers } = hre;

const APP_V5 = '0x924b3f01C5889259bff175507917bA0B607842B6';
const TASK_ID = '0x5a32623702b55ad04f14b0978d5a7bfcdf299300875772d985505a9253dd7b5d';

async function main() {
  console.log('\nChecking callback status...\n');
  console.log('AppV5:', APP_V5);
  console.log('Task ID:', TASK_ID);
  console.log('');

  const appV5 = await ethers.getContractAt("PrimusVeritasAppV5", APP_V5);

  // Check callback attempts
  const count = await appV5.callbackAttemptCount();
  console.log('Callback attempts:', count.toString());

  if (count.gt(0)) {
    for (let i = 0; i < count.toNumber(); i++) {
      const attempt = await appV5.getCallbackAttempt(i);
      console.log(`\n[${i}] Callback:`);
      console.log('  Caller:', attempt.caller);
      console.log('  Task ID:', attempt.taskId);
      console.log('  Attestor:', attempt.attestor);
      console.log('  Success:', attempt.success);
      console.log('  Data:', attempt.data?.substring(0, 200));
    }
  }

  // Check if task processed
  const processed = await appV5.processedTasks(TASK_ID);
  console.log('\nTask processed:', processed);

  // Check pending validation
  const pending = await appV5.getPendingValidation(TASK_ID);
  console.log('\nPending validation:');
  console.log('  Rule ID:', pending.ruleId.toString());
  console.log('  Agent ID:', pending.agentId.toString());

  if (count.gt(0) && processed) {
    console.log('\n✅ SUCCESS! Callback received and processed!');
  } else if (count.gt(0)) {
    console.log('\n⚠️ Callback received but not processed');
  } else {
    console.log('\n⏳ No callback yet. Checking Primus Task status...');
    
    // Check Primus Task
    const primusTask = await ethers.getContractAt([
      "function queryTask(bytes32 taskId) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
    ], '0xC02234058caEaA9416506eABf6Ef3122fCA939E8');
    
    const taskInfo = await primusTask.queryTask(TASK_ID);
    console.log('\nPrimus Task Status:', taskInfo.taskStatus);
    console.log('  0=PENDING, 1=COMPLETED, 2=FAILED');
    console.log('  Callback:', taskInfo.callback);
    console.log('  Task Results:', taskInfo.taskResults.length);
    
    if (taskInfo.taskResults.length > 0) {
      console.log('  Attestation Data:', taskInfo.taskResults[0].attestation.data?.substring(0, 100));
    }
  }
}

main().catch(console.error);
