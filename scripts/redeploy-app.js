const hre = require("hardhat");

async function main() {
  console.log('\n🚀 Redeploying Updated Contracts\n');
  console.log('='.repeat(70));
  
  const REGISTRY_ADDRESS = "0x54be2Ce61135864D9a3c28877ab12758d027b520";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const CHECK_ADDRESS = "0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52";
  
  const [signer] = await hre.ethers.getSigners();
  console.log('Signer:', signer.address);
  console.log('Balance:', hre.ethers.utils.formatEther(await signer.getBalance()), 'ETH\n');
  
  // ============================================
  // Deploy PrimusVeritasApp (with ownership check)
  // ============================================
  console.log('📦 Deploying PrimusVeritasApp (updated)...');
  console.log('─'.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(REGISTRY_ADDRESS, PRIMUS_TASK);
  await app.deployed();
  
  console.log('✅ PrimusVeritasApp deployed!');
  console.log('   Address:', app.address);
  console.log('   Tx Hash:', app.deployTransaction.hash);
  console.log('   Explorer: https://sepolia.basescan.org/address/' + app.address);
  console.log('   Registry:', REGISTRY_ADDRESS);
  console.log('   Primus Task:', PRIMUS_TASK);
  console.log('');
  
  console.log('='.repeat(70));
  console.log('✅ Redeployment Complete!\n');
  console.log('Updated Contract:');
  console.log('  PrimusVeritasApp:', app.address);
  console.log('  FollowerThresholdCheck:', CHECK_ADDRESS, '(unchanged)');
  console.log('  VeritasValidationRegistry:', REGISTRY_ADDRESS, '(unchanged)');
  console.log('');
  console.log('New Features:');
  console.log('  - Agent ownership check in PrimusVeritasApp');
  console.log('  - ValidationRegistry allows any caller');
  console.log('  - Works with existing ERC-8004 identity registry');
}

main().catch(console.error);
