// Get ALL recent TaskSubmitted events
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const EXPECTED_CALLBACK = '0x5029179BEEe1ffD3F5D242214A6ec843A4db7678';

async function main() {
  const provider = ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  
  console.log('Current block:', currentBlock);
  console.log('Looking for TaskSubmitted events...\n');
  
  const taskContract = await ethers.getContractAt([
    "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)",
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  // Query last 50 blocks
  const fromBlock = currentBlock - 50;
  const filter = taskContract.filters.TaskSubmitted();
  const events = await taskContract.queryFilter(filter, fromBlock, currentBlock);
  
  console.log('Found', events.length, 'TaskSubmitted events in last 50 blocks\n');
  
  // Check each task
  for (let i = 0; i < Math.min(events.length, 5); i++) {
    const event = events[events.length - 1 - i]; // Start from most recent
    console.log('[' + (i+1) + '] Task:', event.args.taskId);
    console.log('    Requester:', event.args.requester);
    
    try {
      const task = await taskContract.tasks(event.args.taskId);
      console.log('    Callback:', task.callback);
      
      if (task.callback === EXPECTED_CALLBACK) {
        console.log('    ✅✅✅ THIS IS OUR TEST! CALLBACK MATCHES! ✅✅✅');
      } else if (task.callback !== '0x0000000000000000000000000000000000000000') {
        console.log('    ℹ️ Callback set to different address');
      } else {
        console.log('    ❌ Callback is 0x0000 (SDK default)');
      }
    } catch (e) {
      console.log('    Error querying task:', e.message);
    }
    console.log('');
  }
}

main().catch(console.error);
