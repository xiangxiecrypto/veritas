const hre = require("hardhat");

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const TASK_ID = "0x7fb4293f1a8a6d8055e60bc90e5a1f0b7d7c1d344ad4aa60149b3d7f375b0b07";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🔍 Debugging Callback Issue\n');
  console.log('='.repeat(70));
  console.log('App:', APP);
  console.log('Primus:', PRIMUS);
  console.log('Task ID:', TASK_ID);
  console.log('');
  
  // 1. Check our contract's callback function signature
  console.log('1️⃣ Checking Our Contract Interface');
  console.log('─'.repeat(70));
  
  const appCode = await hre.ethers.provider.getCode(APP);
  console.log('App contract code size:', appCode.length, 'bytes');
  
  // Calculate expected callback selector
  const callbackSig = 'reportTaskResultCallback(bytes32,(address,bytes32,(address,bytes,bytes,string,uint64)),bool)';
  const callbackSelector = hre.ethers.utils.id(callbackSig).slice(0, 10);
  console.log('Expected callback selector:', callbackSelector);
  console.log('Exists in contract:', appCode.includes(callbackSelector.slice(2)) ? '✅ YES' : '❌ NO');
  console.log('');
  
  // 2. Check the actual task result structure
  console.log('2️⃣ Checking Task Result Structure');
  console.log('─'.repeat(70));
  
  const task = new hre.ethers.Contract(PRIMUS, [
    "function queryTask(bytes32) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], signer);
  
  const taskInfo = await task.queryTask(TASK_ID);
  
  console.log('Task Status:', taskInfo.taskStatus, ['INIT', 'SUCCESS', 'PARTIAL_SUCCESS', 'PARTIAL_SUCCESS_SETTLED', 'FAILED'][taskInfo.taskStatus]);
  console.log('Callback Address:', taskInfo.callback);
  console.log('Number of Results:', taskInfo.taskResults.length);
  
  if (taskInfo.taskResults.length > 0) {
    const result = taskInfo.taskResults[0];
    console.log('');
    console.log('Result[0]:');
    console.log('  Attestor:', result.attestor);
    console.log('  TaskId:', result.taskId);
    console.log('  Attestation.recipient:', result.attestation.recipient);
    console.log('  Attestation.data:', result.attestation.data);
    console.log('  Attestation.timestamp:', result.attestation.timestamp.toString());
    
    // Check if timestamp is valid
    if (result.attestation.timestamp > 1000000000) {
      console.log('  Timestamp valid:', new Date(result.attestation.timestamp * 1000).toISOString());
    } else {
      console.log('  ⚠️ Timestamp seems invalid (too small)');
    }
  }
  console.log('');
  
  // 3. Verify callback address matches
  console.log('3️⃣ Verifying Callback Address');
  console.log('─'.repeat(70));
  console.log('Task callback:', taskInfo.callback);
  console.log('Our contract:', APP);
  console.log('Match:', taskInfo.callback.toLowerCase() === APP.toLowerCase() ? '✅ YES' : '❌ NO');
  console.log('');
  
  // 4. Check if there are any failed callbacks in recent blocks
  console.log('4️⃣ Checking Recent Events');
  console.log('─'.repeat(70));
  
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const fromBlock = currentBlock - 200;
  
  console.log('Scanning blocks', fromBlock, 'to', currentBlock);
  
  // Get all CallbackFailed events
  const primus = new hre.ethers.Contract(PRIMUS, [
    "event CallbackFailed(bytes32 indexed taskId, address callback, string reason)"
  ], signer);
  
  const allFailed = await primus.queryFilter(primus.filters.CallbackFailed(), fromBlock);
  console.log('Total CallbackFailed events:', allFailed.length);
  
  // Check if any are for our task
  const ourFailed = allFailed.filter(e => e.args.taskId === TASK_ID);
  console.log('CallbackFailed for our task:', ourFailed.length);
  
  if (ourFailed.length > 0) {
    for (const event of ourFailed) {
      console.log('  Block:', event.blockNumber);
      console.log('  Callback:', event.args.callback);
      console.log('  Reason:', event.args.reason);
    }
  }
  console.log('');
  
  // 5. Get all ReportResult events
  console.log('5️⃣ Checking ReportResult Events');
  console.log('─'.repeat(70));
  
  const primus2 = new hre.ethers.Contract(PRIMUS, [
    "event ReportResult(address indexed attestor, bytes32 indexed taskId, address user, uint8 tokenSymbol, uint256 primusFee, uint256 attestorFee)"
  ], signer);
  
  const reportResults = await primus2.queryFilter(primus2.filters.ReportResult(null, TASK_ID), fromBlock);
  console.log('ReportResult events for our task:', reportResults.length);
  
  if (reportResults.length > 0) {
    for (const event of reportResults) {
      console.log('  Block:', event.blockNumber);
      console.log('  Attestor:', event.args.attestor);
      console.log('  User:', event.args.user);
    }
  } else {
    console.log('  ❌ No ReportResult event found!');
    console.log('  This means Primus did not complete the attestation yet.');
  }
  console.log('');
  
  // 6. Summary
  console.log('='.repeat(70));
  console.log('📊 Summary');
  console.log('─'.repeat(70));
  
  if (ourFailed.length > 0) {
    console.log('❌ ISSUE: Callback failed');
    console.log('   Reason:', ourFailed[0].args.reason);
  } else if (reportResults.length === 0) {
    console.log('❌ ISSUE: No ReportResult event');
    console.log('   The attestation was not fully processed by Primus');
    console.log('   Task shows SUCCESS but report was not submitted');
  } else if (taskInfo.callback.toLowerCase() !== APP.toLowerCase()) {
    console.log('❌ ISSUE: Callback address mismatch');
  } else {
    console.log('✅ All checks passed');
    console.log('   Possible causes:');
    console.log('   - Gas limit exceeded during callback');
    console.log('   - Contract reverted (check onlyTask modifier)');
    console.log('   - Timing/async issue in Primus network');
  }
}

main().catch(console.error);
