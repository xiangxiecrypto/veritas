const hre = require("hardhat");

async function main() {
  const successTx = "0x9246e3a9096cc1a49ed7f1bd844934521f29fac8ba9388e540f397776740b8da";
  const failedTx = "0x7efc4ac80ac5c478cda3807a302b34bd5ae4c4d91a4c94fd9a3505befb1347ce";
  
  console.log('=== COMPARING TRANSACTIONS ===\n');
  
  const tx1 = await hre.ethers.provider.getTransaction(successTx);
  const tx2 = await hre.ethers.provider.getTransaction(failedTx);
  
  console.log('SUCCESS TX (BTC):');
  console.log('  Data length:', tx1.data.length);
  console.log('  Gas Limit:', tx1.gasLimit.toString());
  console.log('  Value:', tx1.value.toString());
  console.log('  First 100 chars:', tx1.data.slice(0, 100));
  
  console.log('\nFAILED TX (Moltbook):');
  console.log('  Data length:', tx2.data.length);
  console.log('  Gas Limit:', tx2.gasLimit.toString());
  console.log('  Value:', tx2.value.toString());
  console.log('  First 100 chars:', tx2.data.slice(0, 100));
  
  // Check if there's a size difference
  console.log('\n=== SIZE COMPARISON ===');
  console.log('BTC tx data size:', (tx1.data.length - 2) / 2, 'bytes');
  console.log('Moltbook tx data size:', (tx2.data.length - 2) / 2, 'bytes');
  
  // Check gas used
  const receipt1 = await hre.ethers.provider.getTransactionReceipt(successTx);
  const receipt2 = await hre.ethers.provider.getTransactionReceipt(failedTx);
  
  console.log('\n=== GAS COMPARISON ===');
  console.log('BTC Gas Used:', receipt1.gasUsed.toString());
  console.log('Moltbook Gas Used:', receipt2.gasUsed.toString());
  console.log('Difference:', receipt2.gasUsed.sub(receipt1.gasUsed).toString());
}

main().catch(console.error);
