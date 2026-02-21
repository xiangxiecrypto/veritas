// Deep dive into Primus Task to understand what happened
const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const TASK_ID = '0x529667f0203481942c253b0dde52a1e783a8393776352849eec64ecb64b5328e';

async function main() {
  console.log('\n🔍 Deep dive into Primus Task status...\n');
  
  const provider = ethers.provider;
  const blockNumber = await provider.getBlockNumber();
  console.log('Current block:', blockNumber);
  
  // Full task info with raw data
  const taskContract = await ethers.getContractAt([
    "function queryTask(bytes32 taskId) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], PRIMUS_TASK);

  const taskInfo = await taskContract.queryTask(TASK_ID);
  
  console.log('\n=== Raw Task Data ===');
  console.log('Template ID:', taskInfo.templateId);
  console.log('Submitter:', taskInfo.submitter);
  console.log('Callback:', taskInfo.callback);
  console.log('Task Status:', taskInfo.taskStatus);
  console.log('  0 = PENDING');
  console.log('  1 = COMPLETED');
  console.log('  2 = FAILED');
  console.log('Token Symbol:', taskInfo.tokenSymbol, '(0=ETH)');
  console.log('Submitted At:', taskInfo.submittedAt.toString(), 'seconds');
  console.log('Submitted Time:', new Date(taskInfo.submittedAt.toNumber() * 1000).toISOString());
  
  console.log('\n=== Attestors ===');
  console.log('Number of attestors:', taskInfo.attestors.length);
  taskInfo.attestors.forEach((a, i) => {
    console.log(`  [${i}] ${a}`);
  });
  
  console.log('\n=== Task Results ===');
  console.log('Number of results:', taskInfo.taskResults.length);
  taskInfo.taskResults.forEach((r, i) => {
    console.log(`\n  [${i}] Task Result:`);
    console.log('    Attestor:', r.attestor);
    console.log('    Task ID:', r.taskId);
    console.log('    Attestation Recipient:', r.attestation.recipient);
    console.log('    Attestation Request (hex):', r.attestation.request.substring(0, 100) + '...');
    console.log('    Attestation Data:', r.attestation.data);
    console.log('    Attestation Timestamp:', r.attestation.timestamp.toString());
  });
  
  // Check transaction receipt
  console.log('\n=== Original Transaction ===');
  const txHash = '0x7d014bc76d2413677a8bd4cc4a3252d3ac1d775deb33cbbda87123b929a22a98';
  const receipt = await provider.getTransactionReceipt(txHash);
  if (receipt) {
    console.log('Tx found in block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
    console.log('Logs count:', receipt.logs.length);
    
    receipt.logs.forEach((log, i) => {
      console.log(`\n  Log[${i}]:`);
      console.log('    Address:', log.address);
      console.log('    Topics:', log.topics);
      console.log('    Data:', log.data.substring(0, 100));
    });
  }
  
  console.log('\n=== Analysis ===');
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - taskInfo.submittedAt.toNumber();
  console.log(`Time elapsed since submission: ${elapsed} seconds (${Math.floor(elapsed/60)} minutes)`);
  
  if (taskInfo.taskStatus === 0) {
    console.log('\n⚠️  Task is still PENDING after', Math.floor(elapsed/60), 'minutes');
    console.log('');
    console.log('Possible reasons:');
    console.log('  1. Primus network did not pick up the task');
    console.log('  2. Attestor is not responding');
    console.log('  3. Coinbase API request failed');
    console.log('  4. Attestor did not submit result on-chain');
    console.log('');
    console.log('The task struct shows:');
    console.log('  - Attestor address is 0x000... (not assigned yet or failed)');
    console.log('  - No attestation data');
    console.log('  - Task status = 0 (PENDING)');
  }
  
  if (taskInfo.attestors[0] === '0x0000000000000000000000000000000000000000' || taskInfo.taskResults.length === 0) {
    console.log('\n❌ No valid attestor has submitted a result');
    console.log('   This suggests the Primus off-chain protocol did not complete');
  }
}

main().catch(console.error);
