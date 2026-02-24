const hre = require("hardhat");

async function main() {
  const txHash = "0xc51437de1858ed7cade3f00e46cbdece28e763c9766092699a71806daee465bc";
  
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
  
  // Check task status
  const taskId = "0x17fcfc46b8ac6faed3f5867c90c121f338151db7e5b1b5dc3c9fa2ea7dae2895";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const [signer] = await hre.ethers.getSigners();
  
  const taskResult = await signer.call({
    to: PRIMUS_TASK,
    data: '0x8d3943ec' + hre.ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
  });
  
  // Get last byte (taskStatus)
  const status = parseInt(taskResult.slice(-2), 16);
  console.log('\nTask Status:', status, '(0=INIT, 1=SUCCESS)');
}

main().catch(console.error);
