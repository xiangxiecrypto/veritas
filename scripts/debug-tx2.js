const hre = require("hardhat");

async function main() {
  const txHash = "0x422f8b43aa4bb5055f8c59db46ceb8a94e123b39cbc26a429cd48ed2179177c9";
  
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
