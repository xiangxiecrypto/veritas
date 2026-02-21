// Check Primus Task status directly
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const TASK_ID = '0x529667f0203481942c253b0dde52a1e783a8393776352849eec64ecb64b5328e';

async function main() {
  console.log('\nChecking Primus Task status...\n');
  console.log('Primus Task:', PRIMUS_TASK);
  console.log('Task ID:', TASK_ID);
  console.log('');

  const taskContract = await ethers.getContractAt([
    "function queryTask(bytes32 taskId) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], PRIMUS_TASK);

  try {
    const taskInfo = await taskContract.queryTask(TASK_ID);
    console.log('Task Info:');
    console.log('  Template:', taskInfo.templateId);
    console.log('  Submitter:', taskInfo.submitter);
    console.log('  Callback:', taskInfo.callback);
    console.log('  Task Status:', taskInfo.taskStatus, '(0=pending, 1=completed, 2=failed)');
    console.log('  Submitted At:', new Date(taskInfo.submittedAt.toNumber() * 1000).toISOString());
    console.log('  Attestors:', taskInfo.attestors.length);
    console.log('  Task Results:', taskInfo.taskResults.length);
    
    if (taskInfo.taskResults.length > 0) {
      console.log('\n  Task Results[0]:');
      console.log('    Attestor:', taskInfo.taskResults[0].attestor);
      console.log('    Data:', taskInfo.taskResults[0].attestation.data.substring(0, 200));
    }

    console.log('\n=== Analysis ===');
    if (taskInfo.taskStatus === 0) {
      console.log('⏳ Task is still pending. Primus is processing...');
    } else if (taskInfo.taskStatus === 1) {
      console.log('✅ Task completed!');
      if (taskInfo.callback === '0x0000000000000000000000000000000000000000') {
        console.log('⚠️ No callback address set!');
      } else {
        console.log('📞 Callback should have been sent to:', taskInfo.callback);
      }
    } else if (taskInfo.taskStatus === 2) {
      console.log('❌ Task failed');
    }
  } catch (e) {
    console.error('Error querying task:', e.message);
  }
}

main().catch(console.error);
