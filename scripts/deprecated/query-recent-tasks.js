// Query recent tasks to find our test
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const EXPECTED_CALLBACK = '0x5029179BEEe1ffD3F5D242214A6ec843A4db7678';

async function main() {
  console.log('\nQuerying recent TaskSubmitted events...\n');
  
  const provider = ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  
  const taskContract = await ethers.getContractAt([
    "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)",
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  // Query last 10 blocks
  const fromBlock = currentBlock - 10;
  const filter = taskContract.filters.TaskSubmitted(null, '0x89BBf3451643eef216c3A60d5B561c58F0D8adb9');
  const events = await taskContract.queryFilter(filter, fromBlock, currentBlock);
  
  console.log('Found', events.length, 'TaskSubmitted events from your wallet\n');
  
  for (const event of events) {
    console.log('Task:', event.args.taskId);
    console.log('  Requester:', event.args.requester);
    console.log('  Template:', event.args.templateId);
    
    const task = await taskContract.tasks(event.args.taskId);
    console.log('  Callback:', task.callback);
    console.log('  Match:', task.callback === EXPECTED_CALLBACK ? '✅ YES! THIS IS OUR TEST!' : '❌ No');
    console.log('');
  }
}

main().catch(console.error);
