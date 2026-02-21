// Check transaction logs directly
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const APP_V5 = '0xAe3022b522A135feC72FF033bbBF98056b8DfC4A';
const TX_HASH = '0xa33261b556b6155cd530325290b1b3b26d7d2c06a4f7f3b651405e2daf2fc4e3';

async function main() {
  const provider = ethers.provider;
  const receipt = await provider.getTransactionReceipt(TX_HASH);
  
  console.log('Transaction:', TX_HASH);
  console.log('To:', receipt.to);
  console.log('Status:', receipt.status);
  console.log('Logs:', receipt.logs.length);
  console.log('');
  
  // Parse each log
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log(`Log[${i}]:`);
    console.log('  Address:', log.address);
    console.log('  Topics:', log.topics);
    
    // Check if this is TaskSubmitted event
    // Topic0 for TaskSubmitted
    const TASK_SUBMITTED_TOPIC = '0xd79c94fb0dcc230bf7d69e707071ada28084c2fd199e45006d7176d6d0e601c5';
    if (log.topics[0] === TASK_SUBMITTED_TOPIC) {
      console.log('  -> This is TaskSubmitted!');
      const requester = '0x' + log.topics[1].slice(26);
      const taskId = '0x' + log.data.slice(2, 66);
      console.log('  -> Requester:', requester);
      console.log('  -> Task ID:', taskId);
      
      // Query task
      const taskContract = await ethers.getContractAt([
        "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
      ], PRIMUS_TASK);
      
      try {
        const task = await taskContract.tasks(taskId);
        console.log('');
        console.log('Task details:');
        console.log('  Callback:', task.callback);
        console.log('  Expected:', APP_V5);
        console.log('  Match:', task.callback === APP_V5 ? '✅ YES!' : '❌ NO');
        
        if (task.callback === APP_V5) {
          console.log('');
          console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
          console.log('║  ✅✅✅ CALLBACK SET CORRECTLY! ✅✅✅                      ║');
          console.log('║                                                                           ║');
          console.log('║  TaskContract.submitTask() works perfectly!                    ║');
          console.log('║  The bug is in PrimusNetwork class!                            ║');
          console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
        }
      } catch (e) {
        console.log('  Error querying task:', e.message);
      }
    }
    console.log('');
  }
}

main().catch(console.error);
