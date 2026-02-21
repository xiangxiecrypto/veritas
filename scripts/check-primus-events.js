// Check Primus Task events
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const APP_V5 = '0xFe18A380bE251006997553A277122390Bac850ef';
const TASK_ID = '0x529667f0203481942c253b0dde52a1e783a8393776352849eec64ecb64b5328e';

async function main() {
  console.log('\nChecking Primus Task events...\n');
  
  const provider = ethers.provider;
  
  // Get recent events from Primus Task
  const blockNumber = await provider.getBlockNumber();
  console.log('Current block:', blockNumber);
  console.log('');
  
  // Check for TaskSubmitted events
  const taskContract = await ethers.getContractAt([
    "event TaskSubmitted(bytes32 indexed taskId, address requester, string templateId)",
    "event TaskCompleted(bytes32 indexed taskId, bool success)"
  ], PRIMUS_TASK);
  
  const filterSubmitted = taskContract.filters.TaskSubmitted(TASK_ID);
  const eventsSubmitted = await taskContract.queryFilter(filterSubmitted, blockNumber - 100);
  
  console.log('TaskSubmitted events:', eventsSubmitted.length);
  eventsSubmitted.forEach(e => {
    console.log('  Block:', e.blockNumber);
    console.log('  TaskId:', e.args.taskId);
    console.log('  Requester:', e.args.requester);
    console.log('  Template:', e.args.templateId);
  });
  
  const filterCompleted = taskContract.filters.TaskCompleted(TASK_ID);
  const eventsCompleted = await taskContract.queryFilter(filterCompleted, blockNumber - 100);
  
  console.log('\nTaskCompleted events:', eventsCompleted.length);
  eventsCompleted.forEach(e => {
    console.log('  Block:', e.blockNumber);
    console.log('  TaskId:', e.args.taskId);
    console.log('  Success:', e.args.success);
  });
  
  // Check AppV5 for CallbackReceived
  const appV5 = await ethers.getContractAt([
    "event CallbackReceived(bytes32 indexed taskId, address caller, address attestor)"
  ], APP_V5);
  
  const filterCallback = appV5.filters.CallbackReceived(TASK_ID);
  const eventsCallback = await appV5.queryFilter(filterCallback, blockNumber - 100);
  
  console.log('\nCallbackReceived events:', eventsCallback.length);
  eventsCallback.forEach(e => {
    console.log('  Block:', e.blockNumber);
    console.log('  TaskId:', e.args.taskId);
    console.log('  Caller:', e.args.caller);
    console.log('  Attestor:', e.args.attestor);
  });
  
  console.log('\n=== Summary ===');
  if (eventsCompleted.length > 0) {
    console.log('✅ Task completed event found');
  } else if (eventsSubmitted.length > 0) {
    console.log('⏳ Task submitted but not completed yet');
  }
  if (eventsCallback.length > 0) {
    console.log('✅ Callback received by AppV5');
  } else {
    console.log('⏳ No callback received yet');
  }
}

main().catch(console.error);
