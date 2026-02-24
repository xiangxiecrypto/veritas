const hre = require("hardhat");

async function main() {
  const reportTxHash = "0x9246e3a9096cc1a49ed7f1bd844934521f29fac8ba9388e540f397776740b8da";
  
  const tx = await hre.ethers.provider.getTransaction(reportTxHash);
  const receipt = await hre.ethers.provider.getTransactionReceipt(reportTxHash);
  
  console.log('=== REPORT TX DETAILS ===');
  console.log('From (Attestor):', tx.from);
  console.log('To:', tx.to);
  console.log('Contract:', tx.creates || tx.to);
  console.log('Data length:', tx.data.length);
  console.log('Data (first 200 chars):', tx.data.slice(0, 200));
  console.log('\nGas Used:', receipt.gasUsed.toString());
  console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  console.log('Logs count:', receipt.logs.length);
  
  // Check if logs exist
  if (receipt.logs.length > 0) {
    console.log('\n=== LOGS ===');
    for (const log of receipt.logs) {
      console.log('\nAddress:', log.address);
      console.log('Topics:', log.topics);
      console.log('Data (first 100):', log.data.slice(0, 100));
    }
  } else {
    console.log('\n⚠️ No logs - transaction may have failed silently or called fallback');
  }
  
  // Check if it's calling the right contract
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  console.log('\n=== CONTRACT CHECK ===');
  console.log('Expected TaskContract:', PRIMUS_TASK);
  console.log('Actual To:', tx.to);
  console.log('Match:', tx.to.toLowerCase() === PRIMUS_TASK.toLowerCase() ? '✅' : '❌');
}

main().catch(console.error);
