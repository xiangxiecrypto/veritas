const hre = require("hardhat");

async function main() {
  console.log('\n🚀 Deploying Updated Contracts\n');
  console.log('='.repeat(70));
  
  const [signer] = await hre.ethers.getSigners();
  console.log('Deployer:', signer.address);
  console.log('Balance:', hre.ethers.utils.formatEther(await signer.getBalance()), 'ETH');
  console.log('');
  
  // Deploy FollowerThresholdCheck
  console.log('📦 Deploying FollowerThresholdCheck...');
  console.log('─'.repeat(70));
  
  const FollowerCheck = await hre.ethers.getContractFactory("FollowerThresholdCheck");
  const followerCheck = await FollowerCheck.deploy();
  await followerCheck.deployed();
  
  console.log('✅ FollowerThresholdCheck deployed!');
  console.log('   Address:', followerCheck.address);
  console.log('   Tx Hash:', followerCheck.deployTransaction.hash);
  console.log('   Explorer: https://sepolia.basescan.org/address/' + followerCheck.address);
  console.log('');
  
  // Deploy new PrimusVeritasApp (interface changed)
  console.log('📦 Deploying PrimusVeritasApp (new version)...');
  console.log('─'.repeat(70));
  
  const REGISTRY = "0x54be2Ce61135864D9a3c28877ab12758d027b520";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(REGISTRY, PRIMUS_TASK);
  await app.deployed();
  
  console.log('✅ PrimusVeritasApp deployed!');
  console.log('   Address:', app.address);
  console.log('   Tx Hash:', app.deployTransaction.hash);
  console.log('   Explorer: https://sepolia.basescan.org/address/' + app.address);
  console.log('   Registry:', REGISTRY);
  console.log('   Primus Task:', PRIMUS_TASK);
  console.log('');
  
  console.log('='.repeat(70));
  console.log('✅ All contracts deployed!\n');
  console.log('Deployed Contracts:');
  console.log('  - FollowerThresholdCheck:', followerCheck.address);
  console.log('  - PrimusVeritasApp:', app.address);
  console.log('  - VeritasValidationRegistry:', REGISTRY, '(existing)');
  console.log('');
  
  console.log('Next steps:');
  console.log('  1. Create rule with template URL');
  console.log('  2. Add check with threshold');
  console.log('  3. Request verification for specific entity');
}

main().catch(console.error);
