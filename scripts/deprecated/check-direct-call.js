// Check the task we just created
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const TASK_ID = '0xc0bbdb724e5cf17a742796786f816db8c0e45d79f02a2db01500a096c819edf0'; // From tx hash
const EXPECTED_CALLBACK = '0x5029179BEEe1ffD3F5D242214A6ec843A4db7678';

async function main() {
  console.log('\nChecking task from direct contract call...\n');
  
  const taskContract = await ethers.getContractAt([
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  // The taskId should be in the transaction logs, let's get it from the tx
  const provider = ethers.provider;
  const tx = await provider.getTransactionReceipt('0xc0bbdb724e5cf17a742796786f816db8c0e45d79f02a2db01500a096c819edf0');
  
  console.log('Transaction logs:', tx.logs.length);
  
  // Parse the TaskSubmitted event
  const iface = new ethers.utils.Interface([
    "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)"
  ]);
  
  for (const log of tx.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === 'TaskSubmitted') {
        const taskId = parsed.args.taskId;
        console.log('Task ID:', taskId);
        console.log('Requester:', parsed.args.requester);
        
        // Now check the task
        const task = await taskContract.tasks(taskId);
        console.log('\nTask details:');
        console.log('  Requester:', task.requester);
        console.log('  Callback:', task.callback);
        console.log('  Expected:', EXPECTED_CALLBACK);
        console.log('  Match:', task.callback === EXPECTED_CALLBACK ? '✅ YES!' : '❌ NO');
        
        if (task.callback === EXPECTED_CALLBACK) {
          console.log('\n🎉🎉🎉 TASKCONTRACT WORKS! CALLBACK SET CORRECTLY! 🎉🎉🎉');
          console.log('The bug is in PrimusNetwork, NOT in TaskContract!');
        }
      }
    } catch (e) {
      // Not the right event
    }
  }
}

main().catch(console.error);
