const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🔍 Checking Pending Transactions\n');
  console.log('Signer:', signer.address);
  
  // Get nonce
  const pendingNonce = await hre.ethers.provider.getTransactionCount(signer.address, "pending");
  const latestNonce = await hre.ethers.provider.getTransactionCount(signer.address, "latest");
  
  console.log('Latest nonce:', latestNonce);
  console.log('Pending nonce:', pendingNonce);
  console.log('Pending txs:', pendingNonce - latestNonce);
  
  if (pendingNonce > latestNonce) {
    console.log('\n⚠️  You have pending transactions!');
    console.log('Wait for them to clear or increase gas price significantly.');
  } else {
    console.log('\n✅ No pending transactions');
  }
}

main().catch(console.error);
