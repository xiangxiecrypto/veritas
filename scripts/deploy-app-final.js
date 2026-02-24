const hre = require("hardhat");

const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log('═══════════════════════════════════════════════════════');
  console.log('DEPLOYING PrimusVeritasApp (with giveFeedback)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Deployer:', wallet.address);
  console.log('');
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  console.log('Constructor Parameters:');
  console.log('  ValidationRegistry:', REGISTRY);
  console.log('  Primus TaskContract:', PRIMUS_TASK);
  console.log('  ReputationRegistry:', REPUTATION_REGISTRY);
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
  
  const receipt = await app.deployTransaction.wait();
  
  console.log('\n✅ DEPLOYED!');
  console.log('   Address:', app.address);
  console.log('   Tx Hash:', app.deployTransaction.hash);
  console.log('   Block:', receipt.blockNumber);
  console.log('   Gas Used:', receipt.gasUsed.toString());
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Summary:');
  console.log('   Contract: PrimusVeritasApp');
  console.log('   Address:', app.address);
  console.log('   Network: Base Sepolia');
  console.log('   Explorer: https://sepolia.basescan.org/address/' + app.address);
  console.log('\n🔗 Connected Contracts:');
  console.log('   ValidationRegistry:', REGISTRY);
  console.log('   Primus TaskContract:', PRIMUS_TASK);
  console.log('   ReputationRegistry:', REPUTATION_REGISTRY);
  console.log('\n🎯 Features:');
  console.log('   ✅ ERC-8004 ValidationRegistry integration');
  console.log('   ✅ ERC-8004 ReputationRegistry.giveFeedback');
  console.log('   ✅ Passes totalScore (not normalized response)');
}

main().catch(console.error);
