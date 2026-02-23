const hre = require("hardhat");

async function main() {
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const REPORT_TX = "0x5266713983fd3fe571e577a62ac8fd9d89e348e4c17e84a9b316fe581c4319ab";
  
  console.log('\n🔍 Analyzing Primus Events\n');
  console.log('='.repeat(70));
  console.log('');
  
  const [signer] = await hre.ethers.getSigners();
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(REPORT_TX);
  
  console.log('Transaction:', REPORT_TX);
  console.log('Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
  console.log('Logs:', receipt.logs.length);
  console.log('');
  
  // Define Primus event interfaces
  const primus = new hre.ethers.Contract(PRIMUS, [
    "event ReportResult(address indexed attestor, bytes32 indexed taskId, address user, uint8 tokenSymbol, uint256 primusFee, uint256 attestorFee)",
    "event CallbackFailed(bytes32 indexed taskId, address callback, string reason)"
  ], signer);
  
  console.log('📋 Decoding Events:');
  console.log('─'.repeat(70));
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    
    console.log(`\nLog ${i}:`);
    console.log('  Address:', log.address);
    console.log('  Topics:', log.topics);
    console.log('  Data (first 100 chars):', log.data.substring(0, 100));
    
    if (log.address.toLowerCase() === PRIMUS.toLowerCase()) {
      console.log('  ✅ Primus event');
      
      // Try to decode each event type
      try {
        // ReportResult
        const reportInterface = new hre.ethers.utils.Interface([
          "event ReportResult(address indexed attestor, bytes32 indexed taskId, address user, uint8 tokenSymbol, uint256 primusFee, uint256 attestorFee)"
        ]);
        const parsed = reportInterface.parseLog(log);
        if (parsed) {
          console.log('  Event: ReportResult');
          console.log('  Attestor:', parsed.args.attestor);
          console.log('  TaskId:', parsed.args.taskId);
          console.log('  User:', parsed.args.user);
          console.log('  TokenSymbol:', parsed.args.tokenSymbol);
          console.log('  PrimusFee:', parsed.args.primusFee.toString());
          console.log('  AttestorFee:', parsed.args.attestorFee.toString());
        }
      } catch (e) {}
      
      try {
        // CallbackFailed
        const failedInterface = new hre.ethers.utils.Interface([
          "event CallbackFailed(bytes32 indexed taskId, address callback, string reason)"
        ]);
        const parsed = failedInterface.parseLog(log);
        if (parsed) {
          console.log('  Event: CallbackFailed');
          console.log('  TaskId:', parsed.args.taskId);
          console.log('  Callback:', parsed.args.callback);
          console.log('  Reason:', parsed.args.reason);
        }
      } catch (e) {}
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Summary:');
  console.log('─'.repeat(70));
  console.log('');
  console.log('The ReportResult event was emitted, but no callback was made.');
  console.log('');
  console.log('This suggests Primus TaskContract does NOT automatically');
  console.log('call the callback address when reportResult is called.');
  console.log('');
  console.log('Possible explanations:');
  console.log('1. Callback is triggered by a separate transaction/process');
  console.log('2. Callback requires specific conditions to be met');
  console.log('3. The Primus implementation is different from what we expect');
}

main().catch(console.error);
