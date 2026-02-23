const hre = require("hardhat");

async function main() {
  const submitTxHash = "0xbe9e50fefb24d8027539974510f8923f9308d982aa3b2347cdc50bd60ac395f5";
  
  console.log('\n🔍 Transaction Analysis\n');
  console.log('='.repeat(70));
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(submitTxHash);
  
  console.log('Tx Hash:', submitTxHash);
  console.log('Block:', receipt.blockNumber);
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
  console.log('Logs count:', receipt.logs.length);
  
  if (receipt.logs.length === 0) {
    console.log('\n⚠️ No events emitted - validation may have failed silently');
  }
  
  // Check each log
  console.log('\nLogs:');
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log(`\n[${i}] Address: ${log.address}`);
    console.log(`    Topics: ${log.topics.length}`);
    if (log.topics.length > 0) {
      console.log(`    Topic0: ${log.topics[0]}`);
    }
  }
  
  console.log('='.repeat(70));
}

main().catch(console.error);
