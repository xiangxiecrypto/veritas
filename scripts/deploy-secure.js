const hre = require("hardhat");

async function main() {
  const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🚀 Deploying Secure PrimusVeritasApp\n');
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
  console.log('Security Features:');
  console.log('  ✅ Attestation data from Primus (not user input)');
  console.log('  ✅ Timestamp from Primus (not user input)');
  console.log('  ✅ Cannot fake follower counts');
  console.log('');
  console.log('Dual Methods:');
  console.log('  ✅ submitAttestation() - Manual (works now)');
  console.log('  ✅ reportTaskResultCallback() - Auto (when Primus fixes gas)');
  console.log('');
  console.log('New Address:', app.address);
}

main().catch(console.error);
