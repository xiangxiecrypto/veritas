const hre = require("hardhat");

async function main() {
  const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🚀 Deploying Optimized PrimusVeritasApp\n');
  console.log('='.repeat(70));
  console.log('Signer:', signer.address);
  console.log('Registry:', REGISTRY);
  console.log('Primus Task:', PRIMUS_TASK);
  console.log('');
  
  console.log('📦 Deploying...');
  console.log('─'.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(REGISTRY, PRIMUS_TASK);
  await app.deployed();
  
  console.log('✅ Deployed!');
  console.log('   Address:', app.address);
  console.log('   Tx Hash:', app.deployTransaction.hash);
  console.log('   Explorer: https://sepolia.basescan.org/address/' + app.address);
  console.log('');
  
  console.log('='.repeat(70));
  console.log('✅ Deployment Complete!\n');
  console.log('Optimizations:');
  console.log('  ✅ Removed callbackAttempts storage (~20k gas)');
  console.log('  ✅ Removed callbackAttemptCount counter (~5k gas)');
  console.log('  ✅ Removed CallbackAttempt struct (~15k gas)');
  console.log('  ✅ Kept only essential processedTasks mapping');
  console.log('  ✅ Estimated savings: ~40k gas');
  console.log('');
  console.log('New Address:', app.address);
}

main().catch(console.error);
