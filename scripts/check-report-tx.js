const hre = require("hardhat");

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const REPORT_TX = "0x5266713983fd3fe571e577a62ac8fd9d89e348e4c17e84a9b316fe581c4319ab";
  const TASK_ID = "0x0a084787452453fb529b85956fecffbc4b139df14b465a5db1b21e3b764328dc";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🔍 Checking Report Transaction\n');
  console.log('='.repeat(70));
  console.log('Report Tx:', REPORT_TX);
  console.log('Task ID:', TASK_ID);
  console.log('');
  
  // 1. Get transaction receipt
  console.log('1️⃣ Transaction Receipt');
  console.log('─'.repeat(70));
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(REPORT_TX);
  
  if (receipt) {
    console.log('Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
    console.log('Block:', receipt.blockNumber);
    console.log('From:', receipt.from);
    console.log('To:', receipt.to);
    console.log('Gas Used:', receipt.gasUsed.toString());
    console.log('Logs Count:', receipt.logs.length);
    console.log('');
    
    // 2. Check logs for callback
    console.log('2️⃣ Event Logs');
    console.log('─'.repeat(70));
    
    for (const log of receipt.logs) {
      console.log('Log:');
      console.log('  Address:', log.address);
      
      // Check if it's our contract
      if (log.address.toLowerCase() === APP.toLowerCase()) {
        console.log('  ✅ This is our contract!');
        
        // Try to decode
        const appInterface = new hre.ethers.utils.Interface([
          "event CallbackReceived(bytes32 indexed taskId, address caller, address attestor)",
          "event ValidationCompleted(bytes32 indexed taskId, uint8 score)"
        ]);
        
        try {
          const parsed = appInterface.parseLog(log);
          if (parsed) {
            console.log('  Event:', parsed.name);
            console.log('  Args:', parsed.args);
          }
        } catch (e) {}
      }
      
      // Check if it's Primus
      if (log.address.toLowerCase() === PRIMUS.toLowerCase()) {
        console.log('  ✅ This is Primus TaskContract');
        
        const primusInterface = new hre.ethers.utils.Interface([
          "event ReportResult(address indexed attestor, bytes32 indexed taskId, address user, uint8 tokenSymbol, uint256 primusFee, uint256 attestorFee)"
        ]);
        
        try {
          const parsed = primusInterface.parseLog(log);
          if (parsed) {
            console.log('  Event:', parsed.name);
            console.log('  Args:', parsed.args);
          }
        } catch (e) {}
      }
    }
    console.log('');
  } else {
    console.log('❌ Transaction not found!');
    console.log('   The tx may still be pending or was not submitted');
    console.log('');
  }
  
  // 3. Check our contract state
  console.log('3️⃣ Contract State');
  console.log('─'.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const attemptCount = await app.callbackAttemptCount();
  console.log('Callback Attempts:', attemptCount.toString());
  
  if (attemptCount.gt(0)) {
    for (let i = 0; i < attemptCount.toNumber(); i++) {
      const attempt = await app.getCallbackAttempt(i);
      console.log(`Attempt ${i}:`);
      console.log('  Task ID:', attempt.taskId);
      console.log('  Caller:', attempt.caller);
      console.log('  Data:', attempt.data);
      console.log('  Success:', attempt.success);
    }
  }
  
  const processed = await app.processedTasks(TASK_ID);
  console.log('Task Processed:', processed);
  console.log('');
  
  // 4. Check Primus task status
  console.log('4️⃣ Primus Task Status');
  console.log('─'.repeat(70));
  
  const task = new hre.ethers.Contract(PRIMUS, [
    "function queryTask(bytes32) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], signer);
  
  const taskInfo = await task.queryTask(TASK_ID);
  console.log('Status:', ['INIT', 'SUCCESS', 'PARTIAL_SUCCESS', 'PARTIAL_SUCCESS_SETTLED', 'FAILED'][taskInfo.taskStatus]);
  console.log('Callback:', taskInfo.callback);
  console.log('Results:', taskInfo.taskResults.length);
  
  if (taskInfo.taskResults.length > 0) {
    console.log('Data:', taskInfo.taskResults[0].attestation.data);
  }
  console.log('');
  
  console.log('='.repeat(70));
}

main().catch(console.error);
