const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const taskId = "0x17fcfc46b8ac6faed3f5867c90c121f338151db7e5b1b5dc3c9fa2ea7dae2895";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const APP = "0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e";
  
  console.log('Waiting 60 seconds for Primus to submit on-chain...\n');
  
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 10000));
    
    const taskResult = await wallet.call({
      to: PRIMUS_TASK,
      data: '0x8d3943ec' + ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
    });
    
    const status = parseInt(taskResult.slice(-2), 16);
    console.log('Check', i+1, '- Status:', status, '(0=INIT, 1=SUCCESS)');
    
    if (status === 1) {
      console.log('\n✅ Task SUCCESS! Submitting attestation...');
      
      const gasPrice = await ethers.provider.getGasPrice();
      const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
      const app = App.attach(APP);
      
      const submitTx = await app.submitAttestation(taskId, {
        gasPrice: gasPrice.mul(3),
        gasLimit: 1000000
      });
      
      const receipt = await submitTx.wait();
      
      console.log('\n✅ SUBMITTED!');
      console.log('   Tx:', submitTx.hash);
      console.log('   Gas Used:', receipt.gasUsed.toString());
      
      // Get score
      const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
      const registry = Registry.attach("0xAeFdE0707014b6540128d3835126b53F073fEd40");
      const score = await registry.getTotalScore(1018);
      console.log('   Agent Score:', score.toString());
      
      return;
    }
  }
  
  console.log('\n❌ Task still not confirmed after 60 seconds');
}

main().catch(console.error);
