const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const gasPrice = await ethers.provider.getGasPrice();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('DEPLOYING ReputationRegistry');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Deployer:', wallet.address);
  console.log('');
  
  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  
  console.log('📝 Deploying...');
  const registry = await ReputationRegistry.deploy({
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  
  await registry.deployed();
  
  console.log('\n✅ Deployed!');
  console.log('   Address:', registry.address);
  console.log('   Tx Hash:', registry.deployTransaction.hash);
  console.log('   Gas Used:', (await registry.deployTransaction.wait()).gasUsed.toString());
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Functions:');
  console.log('   - giveFeedback(agentId, value)');
  console.log('   - getReputation(agentId)');
  console.log('   - getAverageFeedback(agentId)');
  console.log('   - getFeedbackCount(agentId)');
}

main().catch(console.error);
