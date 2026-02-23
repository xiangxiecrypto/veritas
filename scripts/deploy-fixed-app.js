const hre = require("hardhat");

async function main() {
  const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🚀 Deploying Fixed PrimusVeritasApp\n');
  console.log('='.repeat(70));
  console.log('Signer:', signer.address);
  console.log('Balance:', hre.ethers.utils.formatEther(await signer.getBalance()), 'ETH');
  console.log('Registry:', REGISTRY);
  console.log('Primus Task:', PRIMUS_TASK);
  console.log('');
  
  console.log('📦 Deploying PrimusVeritasApp...');
  console.log('─'.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(REGISTRY, PRIMUS_TASK);
  await app.deployed();
  
  console.log('✅ PrimusVeritasApp deployed!');
  console.log('   Address:', app.address);
  console.log('   Tx Hash:', app.deployTransaction.hash);
  console.log('   Explorer: https://sepolia.basescan.org/address/' + app.address);
  console.log('');
  
  console.log('='.repeat(70));
  console.log('✅ Deployment Complete!\n');
  console.log('Features:');
  console.log('  ✅ Uses uint8 for tokenSymbol (correct selector 0x5ae543eb)');
  console.log('  ✅ Implements IPrimusNetworkCallback');
  console.log('  ✅ Agent ownership check enabled');
  console.log('  ✅ Empty templateId in submitTask');
  console.log('  ✅ Callback address will be set correctly');
  console.log('');
  console.log('Deployed Address:', app.address);
}

main().catch(console.error);
