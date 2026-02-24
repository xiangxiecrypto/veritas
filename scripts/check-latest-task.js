const hre = require("hardhat");

async function main() {
  const [wallet] = await hre.ethers.getSigners();
  const taskId = "0x2573eda76be205e48d5ccbdf212251b3d52b1ec6ebdb187169a18be3e60bb441";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  // Check task status
  const taskResult = await wallet.call({
    to: PRIMUS_TASK,
    data: '0x8d3943ec' + hre.ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
  });
  
  const status = parseInt(taskResult.slice(-2), 16);
  console.log('Task ID:', taskId);
  console.log('Task Status:', status, '(0=INIT, 1=SUCCESS)');
  
  if (status === 1) {
    console.log('\n✅ Task is SUCCESS! Ready to submit.');
    console.log('Run: submitAttestation()');
  } else {
    console.log('\n❌ Task still in INIT state');
    console.log('Waiting for Primus to submit on-chain...');
    
    // Wait and check again
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 10000));
      
      const result = await wallet.call({
        to: PRIMUS_TASK,
        data: '0x8d3943ec' + hre.ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
      });
      
      const s = parseInt(result.slice(-2), 16);
      console.log(`Check ${i+1}: Status = ${s}`);
      
      if (s === 1) {
        console.log('\n✅ Task SUCCESS!');
        break;
      }
    }
  }
}

main().catch(console.error);
