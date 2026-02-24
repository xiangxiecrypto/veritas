const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const taskId = "0xe6273d01d6bda61e344811a5fa9144549973099eb754f780c32e5d3ea52b45b3";
  
  // Use low-level call to get raw data
  const [signer] = await hre.ethers.getSigners();
  
  const callData = ethers.utils.defaultAbiCoder.encode(
    ['bytes32'],
    [taskId]
  );
  
  const result = await signer.call({
    to: PRIMUS_TASK,
    data: '0x8d3943ec' + callData.slice(2)  // queryTask selector
  });
  
  console.log('Raw result length:', result.length);
  console.log('Raw result:', result);
  
  // Look for timestamp-like values
  const hex = result.slice(2);
  const chunks = hex.match(/.{1,64}/g) || [];
  
  console.log('\n=== Potential timestamps (looking for ~1771894xxx) ===');
  chunks.forEach((chunk, i) => {
    const val = parseInt(chunk, 16);
    if (val > 1700000000 && val < 2000000000) {
      console.log(`Chunk ${i}: ${val} = ${new Date(val * 1000).toISOString()}`);
    }
    if (val > 1700000000000 && val < 2000000000000) {
      console.log(`Chunk ${i}: ${val}ms = ${new Date(val).toISOString()}`);
    }
  });
}

main().catch(console.error);
