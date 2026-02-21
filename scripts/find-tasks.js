// Query recent tasks from the wallet
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const APP_V5 = '0x5fd86B1F5Cc3Ec213552e4932BDa75b3f997B5Db';

async function main() {
  console.log('\nQuerying recent tasks...\n');
  
  const taskContract = await ethers.getContractAt([
    "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)",
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log('Current block:', currentBlock);
  
  // Query last 20 blocks
  const filter = taskContract.filters.TaskSubmitted();
  const events = await taskContract.queryFilter(filter, currentBlock - 20, currentBlock);
  
  console.log('Found', events.length, 'tasks in last 20 blocks\n');
  
  // Check last 3 tasks
  for (const event of events.slice(-3)) {
    const taskId = event.args.taskId;
    console.log('Task:', taskId);
    console.log('  Requester:', event.args.requester);
    
    try {
      const task = await taskContract.tasks(taskId);
      console.log('  Callback:', task.callback);
      
      if (task.callback === APP_V5) {
        console.log('  ✅✅✅ THIS IS OUR TEST! CALLBACK MATCHES! ✅✅✅');
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
        console.log('║  ✅✅✅ CALLBACK SET CORRECTLY! ✅✅✅                      ║');
        console.log('║                                                                           ║');
        console.log('║  Direct TaskContract.submitTask() works!                       ║');
        console.log('║  The bug is in PrimusNetwork class!                            ║');
        console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
      } else if (task.callback === '0x0000000000000000000000000000000000000000') {
        console.log('  ❌ Callback is 0x0000 (SDK default)');
      } else {
        console.log('  ℹ️ Callback:', task.callback);
      }
    } catch (e) {
      console.log('  Error:', e.message);
    }
    console.log('');
  }
}

main().catch(console.error);
