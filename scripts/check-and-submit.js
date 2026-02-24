const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const taskId = "0x17fcfc46b8ac6faed3f5867c90c121f338151db7e5b1b5dc3c9fa2ea7dae2895";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const APP = "0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e";
  
  // Check task status
  const taskResult = await wallet.call({
    to: PRIMUS_TASK,
    data: '0x8d3943ec' + ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
  });
  
  const status = parseInt(taskResult.slice(-2), 16);
  console.log('Task Status:', status, '(0=INIT, 1=SUCCESS)');
  
  if (status === 1) {
    console.log('\n✅ Task is SUCCESS! Submitting attestation...');
    
    const gasPrice = await ethers.provider.getGasPrice();
    const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
    const app = App.attach(APP);
    
    const submitTx = await app.submitAttestation(taskId, {
      gasPrice: gasPrice.mul(3),
      gasLimit: 1000000
    });
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await submitTx.wait();
    
    console.log('\n✅ Submitted!');
    console.log('   Tx Hash:', submitTx.hash);
    console.log('   Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
    console.log('   Gas Used:', receipt.gasUsed.toString());
    
    // Parse events
    console.log('\n📊 Events:');
    for (const log of receipt.logs) {
      try {
        const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
        console.log('   Event:', parsed.name);
        
        if (parsed.name === 'ValidationCompleted') {
          console.log('     Agent ID:', parsed.args.agentId.toString());
          console.log('     Score:', parsed.args.normalizedScore.toString());
        }
      } catch (e) {}
    }
  } else {
    console.log('\n❌ Task still in INIT state');
    console.log('   Primus has not submitted on-chain yet');
  }
}

main().catch(console.error);
