const hre = require("hardhat");

async function main() {
  const txHash = "0x7efc4ac80ac5c478cda3807a302b34bd5ae4c4d91a4c94fd9a3505befb1347ce";
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
  
  console.log('=== TRANSACTION RECEIPT ===');
  console.log('Status:', receipt.status);
  console.log('Logs Count:', receipt.logs.length);
  console.log('Gas Used:', receipt.gasUsed.toString());
  
  if (receipt.logs.length > 0) {
    console.log('\n=== RAW LOGS ===');
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`\nLog ${i}:`);
      console.log('  Address:', log.address);
      console.log('  Topics:', log.topics);
      console.log('  Data:', log.data.slice(0, 100) + '...');
    }
  } else {
    console.log('\n⚠️ NO LOGS - Transaction reverted before any events');
  }
  
  // Check if there's a revert reason
  const tx = await hre.ethers.provider.getTransaction(txHash);
  
  console.log('\n=== CHECKING TRACE ===');
  try {
    // Try with debug_traceTransaction if available
    const trace = await hre.ethers.provider.send('debug_traceTransaction', [txHash, {}]);
    console.log('Trace available');
    if (trace.failed) {
      console.log('Failed at:', trace.gas);
      console.log('Error:', trace.returnValue);
    }
  } catch (e) {
    console.log('Trace not available:', e.message.slice(0, 100));
  }
}

main().catch(console.error);
