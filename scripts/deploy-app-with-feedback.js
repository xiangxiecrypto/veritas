const hre = require("hardhat");

const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log('═══════════════════════════════════════════════════════');
  console.log('DEPLOYING PrimusVeritasApp (with ERC-8004 giveFeedback)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Deployer:', wallet.address);
  console.log('');
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  console.log('Constructor Parameters:');
  console.log('  Registry:', REGISTRY);
  console.log('  Primus Task:', PRIMUS_TASK);
  console.log('  Reputation Registry:', REPUTATION_REGISTRY);
  console.log('');
  
  const PrimusVeritasApp = await hre.ethers.getContractFactory("PrimusVeritasApp");
  
  console.log('📝 Deploying...');
  const app = await PrimusVeritasApp.deploy(
    REGISTRY,
    PRIMUS_TASK,
    REPUTATION_REGISTRY,
    {
      gasPrice: gasPrice.mul(3),
      gasLimit: 3000000
    }
  );
  
  await app.deployed();
  
  console.log('\n✅ Deployed!');
  console.log('   Address:', app.address);
  console.log('   Tx Hash:', app.deployTransaction.hash);
  console.log('   Gas Used:', (await app.deployTransaction.wait()).gasUsed.toString());
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Features:');
  console.log('   ✅ VeritasValidationRegistry integration');
  console.log('   ✅ Primus TaskContract callback');
  console.log('   ✅ ERC-8004 ReputationRegistry.giveFeedback(agentId, score)');
  console.log('\n   Explorer: https://sepolia.basescan.org/address/' + app.address);
}

main().catch(console.error);
