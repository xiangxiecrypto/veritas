// Check the transaction we just submitted
const hre = require("hardhat");
const { ethers } = hre;

const TX_HASH = '0xc1f8c1603470464c86bf2dcf324760d43f1ebb2f2174bd1410de665a16fb6985';
const CONTRACT = '0xf072e418D2272F89B47bC51cf8896658Bb0e575e';
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

async function main() {
  const provider = ethers.provider;
  
  console.log('Checking transaction:', TX_HASH);
  console.log('');
  
  const receipt = await provider.getTransactionReceipt(TX_HASH);
  console.log('Transaction receipt:');
  console.log('  Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  console.log('  Block:', receipt.blockNumber);
  console.log('  To:', receipt.to);
  console.log('  Logs count:', receipt.logs.length);
  console.log('');
  
  // Parse logs
  const primusInterface = new ethers.utils.Interface([
    "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)"
  ]);
  
  receipt.logs.forEach((log, i) => {
    console.log(`Log[${i}]:`);
    console.log('  Address:', log.address);
    console.log('  Topics:', log.topics);
    
    try {
      const parsed = primusInterface.parseLog(log);
      console.log('  Event:', parsed.name);
      console.log('  Args:', parsed.args);
      if (parsed.name === 'TaskSubmitted') {
        console.log('  ✅ Task ID:', parsed.args.taskId);
        
        // Now check the task
        checkTask(parsed.args.taskId, CONTRACT);
      }
    } catch (e) {
      console.log('  (Could not parse)');
    }
    console.log('');
  });
}

async function checkTask(taskId, expectedCallback) {
  const primusTask = await ethers.getContractAt([
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  const task = await primusTask.tasks(taskId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TASK INFO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Task ID:', taskId);
  console.log('  Requester:', task.requester);
  console.log('  Callback:', task.callback);
  console.log('  Expected:', expectedCallback);
  console.log('  Match:', task.callback === expectedCallback ? '✅ YES!' : '❌ NO');
  console.log('  Status:', task.status);
  console.log('');
}

main().catch(console.error);
