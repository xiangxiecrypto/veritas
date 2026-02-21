// Check the task we just created
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const APP_V5 = '0x5fd86B1F5Cc3Ec213552e4932BDa75b3f997B5Db';
const TX_HASH = '0x9cd7f5a695861041f3d9041863c0a181302d13b7d8ea00b4383424a8ff2af886';

async function main() {
  console.log('\nChecking task created by direct TaskContract call...\n');
  
  const provider = ethers.provider;
  const receipt = await provider.getTransactionReceipt(TX_HASH);
  
  console.log('Transaction:', TX_HASH);
  console.log('Block:', receipt.blockNumber);
  console.log('Status:', receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED');
  console.log('');
  
  // Query recent TaskSubmitted events
  const taskContract = await ethers.getContractAt([
    "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)",
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  const filter = taskContract.filters.TaskSubmitted(null, '0x89BBf3451643eef216c3A60d5B561c58F0D8adb9');
  const events = await taskContract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
  
  if (events.length > 0) {
    const event = events[0];
    const taskId = event.args.taskId;
    console.log('Task ID:', taskId);
    console.log('Requester:', event.args.requester);
    console.log('');
    
    // Check task details
    const task = await taskContract.tasks(taskId);
    console.log('Task details:');
    console.log('  Requester:', task.requester);
    console.log('  Callback:', task.callback);
    console.log('  Expected:', APP_V5);
    console.log('');
    
    if (task.callback === APP_V5) {
      console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
      console.log('║  ✅✅✅ CALLBACK SET CORRECTLY! ✅✅✅                      ║');
      console.log('║                                                                           ║');
      console.log('║  Direct TaskContract.submitTask() works perfectly!             ║');
      console.log('║  The bug is in PrimusNetwork class!                            ║');
      console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('Auto-callback will work!');
      console.log('Primus will call reportTaskResultCallback() on', APP_V5);
    } else {
      console.log('❌ Callback not set correctly');
      console.log('  Got:', task.callback);
    }
  } else {
    console.log('No TaskSubmitted event found');
  }
}

main().catch(console.error);
