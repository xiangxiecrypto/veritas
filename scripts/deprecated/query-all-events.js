// Query all events from the block
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const CONTRACT = '0xf072e418D2272F89B47bC51cf8896658Bb0e575e';
const BLOCK = 37955688;

async function main() {
  const provider = ethers.provider;
  
  console.log('Querying block', BLOCK, 'for all events...\n');
  
  // Get all logs from the block
  const logs = await provider.getLogs({
    fromBlock: BLOCK,
    toBlock: BLOCK,
    address: PRIMUS_TASK
  });
  
  console.log('Found', logs.length, 'logs from Primus Task contract:\n');
  
  logs.forEach((log, i) => {
    console.log('Log[' + i + ']:');
    console.log('  Topics:', log.topics);
    console.log('  Data:', log.data.substring(0, 100));
    
    // Try to decode as TaskSubmitted
    // Topic0 for TaskSubmitted: 0xd79c94fb0dcc230bf7d69e707071ada28084c2fd199e45006d7176d6d0e601c5
    if (log.topics[0] === '0xd79c94fb0dcc230bf7d69e707071ada28084c2fd199e45006d7176d6d0e601c5') {
      console.log('  -> This is TaskSubmitted event!');
      const requester = '0x' + log.topics[1].slice(26);
      console.log('  -> Requester:', requester);
      
      // TaskId might be in data
      const taskId = '0x' + log.data.slice(2, 66);
      console.log('  -> Task ID:', taskId);
      
      // Check this task
      checkTask(taskId, CONTRACT);
    }
    console.log('');
  });
}

async function checkTask(taskId, expectedCallback) {
  const primusTask = await ethers.getContractAt([
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  try {
    const task = await primusTask.tasks(taskId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TASK INFO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Task ID:', taskId);
    console.log('  Requester:', task.requester);
    console.log('  Callback:', task.callback);
    console.log('  Expected:', expectedCallback);
    console.log('  Match:', task.callback.toLowerCase() === expectedCallback.toLowerCase() ? '✅ YES! CALLBACK WORKS!' : '❌ NO');
    console.log('  Status:', task.status);
    console.log('');
  } catch (e) {
    console.log('Error querying task:', e.message);
  }
}

main().catch(console.error);
