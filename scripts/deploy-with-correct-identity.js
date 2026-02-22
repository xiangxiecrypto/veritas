/**
 * Deploy new VeritasValidationRegistry with correct ERC-8004 IdentityRegistry
 */

const hre = require("hardhat");

async function main() {
  console.log('\n🔧 Deploying VeritasValidationRegistry with Correct Identity\n');
  console.log('='.repeat(70));
  
  const CORRECT_IDENTITY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const [signer] = await hre.ethers.getSigners();
  console.log('Signer:', signer.address);
  console.log('Correct Identity Registry:', CORRECT_IDENTITY);
  console.log('');
  
  // ============================================
  // Deploy VeritasValidationRegistry
  // ============================================
  console.log('📦 Deploying VeritasValidationRegistry...');
  console.log('─'.repeat(70));
  
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = await Registry.deploy();
  await registry.deployed();
  
  console.log('✅ Registry deployed!');
  console.log('   Address:', registry.address);
  console.log('   Tx Hash:', registry.deployTransaction.hash);
  console.log('   Explorer: https://sepolia.basescan.org/address/' + registry.address);
  console.log('');
  
  // ============================================
  // Initialize with correct identity
  // ============================================
  console.log('🔧 Initializing with ERC-8004 IdentityRegistry...');
  console.log('─'.repeat(70));
  
  const tx2 = await registry.initialize(CORRECT_IDENTITY);
  console.log('Tx sent:', tx2.hash);
  
  const receipt2 = await tx2.wait();
  console.log('✅ Initialized!');
  console.log('   Block:', receipt2.blockNumber);
  console.log('   Identity Registry:', CORRECT_IDENTITY);
  console.log('   Explorer: https://sepolia.basescan.org/tx/' + tx2.hash);
  
  // Verify
  const setIdentity = await registry.getIdentityRegistry();
  console.log('\n✅ Verification:');
  console.log('   Identity Registry set to:', setIdentity);
  console.log('   Correct:', setIdentity === CORRECT_IDENTITY);
  console.log('');
  
  // ============================================
  // Deploy new PrimusVeritasApp
  // ============================================
  console.log('📦 Deploying PrimusVeritasApp with new registry...');
  console.log('─'.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(registry.address, PRIMUS_TASK);
  await app.deployed();
  
  console.log('✅ App deployed!');
  console.log('   Address:', app.address);
  console.log('   Tx Hash:', app.deployTransaction.hash);
  console.log('   Explorer: https://sepolia.basescan.org/address/' + app.address);
  console.log('   Registry:', registry.address);
  console.log('   Primus Task:', PRIMUS_TASK);
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Complete!\n');
  console.log('New Contracts:');
  console.log('  VeritasValidationRegistry:', registry.address);
  console.log('  PrimusVeritasApp:', app.address);
  console.log('  Identity Registry:', CORRECT_IDENTITY, '(existing ERC-8004)');
}

main().catch(console.error);
