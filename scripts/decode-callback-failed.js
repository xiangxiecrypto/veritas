const hre = require("hardhat");

async function main() {
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const REPORT_TX = "0x5266713983fd3fe571e577a62ac8fd9d89e348e4c17e84a9b316fe581c4319ab";
  
  console.log('\n🔍 Decoding CallbackFailed Event\n');
  console.log('='.repeat(70));
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(REPORT_TX);
  
  // CallbackFailed event
  const callbackFailedInterface = new hre.ethers.utils.Interface([
    "event CallbackFailed(bytes32 indexed taskId, address callback, string reason)"
  ]);
  
  // Log 0 is CallbackFailed
  const log = receipt.logs[0];
  
  console.log('CallbackFailed Event:');
  console.log('─'.repeat(70));
  
  try {
    const parsed = callbackFailedInterface.parseLog(log);
    console.log('Task ID:', parsed.args.taskId);
    console.log('Callback:', parsed.args.callback);
    console.log('Reason:', parsed.args.reason);
    console.log('');
    console.log('❌ CALLBACK FAILED WITH REASON:');
    console.log('   "' + parsed.args.reason + '"');
  } catch (e) {
    console.log('Error parsing:', e.message);
    
    // Try manual decode
    console.log('');
    console.log('Manual decode:');
    console.log('Topics:', log.topics);
    console.log('Data:', log.data);
    
    // Decode data (taskId, callback, reason)
    const abiCoder = new hre.ethers.utils.AbiCoder();
    const decoded = abiCoder.decode(
      ['bytes32', 'address', 'string'],
      log.data
    );
    console.log('');
    console.log('Task ID:', decoded[0]);
    console.log('Callback:', decoded[1]);
    console.log('Reason:', decoded[2]);
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
