const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🔍 Checking Transaction by Nonce\n');
  
  // Try to get transaction with nonce 458
  const tx = await hre.ethers.provider.getTransactionCount(signer.address, "latest");
  console.log('Latest nonce:', tx);
  
  // Check if there's a transaction hash for nonce 458
  // We need to look at the mempool or recent blocks
  const latestBlock = await hre.ethers.provider.getBlockNumber();
  
  for (let i = 0; i < 20; i++) {
    const block = await hre.ethers.provider.getBlock(latestBlock - i, true);
    if (block && block.transactions) {
      for (const txHash of block.transactions) {
        const tx = await hre.ethers.provider.getTransaction(txHash);
        if (tx && tx.from.toLowerCase() === signer.address.toLowerCase()) {
          console.log(`\nFound tx in block ${block.number}:`);
          console.log('  Hash:', tx.hash);
          console.log('  Nonce:', tx.nonce);
          console.log('  To:', tx.to);
          console.log('  Value:', hre.ethers.utils.formatEther(tx.value), 'ETH');
          return;
        }
      }
    }
  }
  
  console.log('No recent transactions found');
}

main().catch(console.error);
