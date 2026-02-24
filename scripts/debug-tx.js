const hre = require("hardhat");

async function main() {
  const txHash = "0xcd94192c1e17e0522cc22795f0ff8d34cdb81451f720323a07d349c5a5033163";
  
  const tx = await hre.ethers.provider.getTransaction(txHash);
  
  try {
    const result = await hre.ethers.provider.call({
      to: tx.to,
      data: tx.data,
      from: tx.from
    }, tx.blockNumber - 1);
    console.log('Result:', result);
  } catch (e) {
    console.log('Error:', e.reason || e.message);
    
    if (e.data && e.data.includes('0x08c379a0')) {
      const errorUtf8 = hre.ethers.utils.toUtf8String('0x' + e.data.slice(138));
      console.log('Error message:', errorUtf8);
    }
  }
}

main().catch(console.error);
