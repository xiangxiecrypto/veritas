// Find recent tasks from our wallet
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const APP_V5 = '0xAe3022b522A135feC72FF033bbBF98056b8DfC4A';

async function main() {
  console.log('\nFinding recent tasks...\n');
  
  const taskContract = await ethers.getContractAt([
    "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)",
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log('Current block:', currentBlock);
  
  // Get all recent TaskSubmitted events
  const filter = taskContract.filters.TaskSubmitted();
  const events = await taskContract.queryFilter(filter, currentBlock - 10, currentBlock);
  
  console.log('Found', events.length, 'tasks in last 10 blocks\n');
  
  for (const event of events.slice(-3)) { // Last 3 tasks
    const taskId = event.args.taskId;
    console.log('Task:', taskId);
    console.log('  Requester:', event.args.requester);
    
    try {
      const task = await taskContract.tasks(taskId);
      console.log('  Callback:', task.callback);
      
      if (task.callback === APP_V5) {
        console.log('  ✅✅✅ THIS IS OUR TEST! CALLBACK MATCHES! ✅✅✅');
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
