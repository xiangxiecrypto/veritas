// Find the task by checking recent tasks
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const CONTRACT = '0xf072e418D2272F89B47bC51cf8896658Bb0e575e';
const TX_HASH = '0xc1f8c1603470464c86bf2dcf324760d43f1ebb2f2174bd1410de665a16fb6985';

async function main() {
  const provider = ethers.provider;
  
  // Get transaction details
  const tx = await provider.getTransaction(TX_HASH);
  const block = await provider.getBlock(tx.blockNumber);
  
  console.log('Transaction details:');
  console.log('  Block:', tx.blockNumber);
  console.log('  Time:', new Date(block.timestamp * 1000).toISOString());
  console.log('  From:', tx.from);
  console.log('  To:', tx.to);
  console.log('');
  
  // Query events from that block
  const primusTask = await ethers.getContractAt([
    "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)",
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  const filter = primusTask.filters.TaskSubmitted(null, tx.from);
  const events = await primusTask.queryFilter(filter, tx.blockNumber, tx.blockNumber);
  
  console.log('TaskSubmitted events from block', tx.blockNumber + ':');
  console.log('  Found:', events.length);
  console.log('');
  
  for (const event of events) {
    console.log('Task:', event.args.taskId);
    console.log('  Requester:', event.args.requester);
    console.log('  Template:', event.args.templateId);
    
    // Check task details
    const task = await primusTask.tasks(event.args.taskId);
    console.log('  Callback:', task.callback);
    console.log('  Expected:', CONTRACT);
    console.log('  Match:', task.callback === CONTRACT ? '✅ YES!' : '❌ NO');
    console.log('');
  }
}

main().catch(console.error);
