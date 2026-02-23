const hre = require("hardhat");

async function main() {
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const TASK_ID = "0x7fb4293f1a8a6d8055e60bc90e5a1f0b7d7c1d344ad4aa60149b3d7f375b0b07";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🔍 Checking Primus TaskContract Status\n');
  console.log('='.repeat(70));
  console.log('Primus Task:', PRIMUS);
  console.log('Task ID:', TASK_ID);
  console.log('');
  
  const task = new hre.ethers.Contract(PRIMUS, [
    "function queryTask(bytes32) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], signer);
  
  const taskInfo = await task.queryTask(TASK_ID);
  
  console.log('📋 Task Info from Primus:');
  console.log('─'.repeat(70));
  console.log('Template ID:', taskInfo.templateId);
  console.log('Submitter:', taskInfo.submitter);
  console.log('Callback:', taskInfo.callback);
  console.log('Token Symbol:', taskInfo.tokenSymbol);
  console.log('Task Status:', taskInfo.taskStatus, ['INIT', 'SUCCESS', 'PARTIAL_SUCCESS', 'PARTIAL_SUCCESS_SETTLED', 'FAILED'][taskInfo.taskStatus]);
  console.log('Submitted At:', new Date(taskInfo.submittedAt * 1000).toISOString());
  console.log('Attestors:', taskInfo.attestors);
  console.log('Task Results Count:', taskInfo.taskResults.length);
  console.log('');
  
  if (taskInfo.taskResults.length > 0) {
    const result = taskInfo.taskResults[0];
    console.log('📊 Task Result[0]:');
    console.log('  Attestor:', result.attestor);
    console.log('  Task ID:', result.taskId);
    console.log('  Data:', result.attestation.data);
    console.log('  Timestamp:', new Date(result.attestation.timestamp * 1000).toISOString());
    console.log('');
    
    if (result.attestor !== '0x0000000000000000000000000000000000000000') {
      console.log('✅ Attestation was submitted to Primus!');
      console.log('   But callback may not have been triggered yet.');
    }
  } else {
    console.log('⏳ No task results yet - attestation still pending');
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
