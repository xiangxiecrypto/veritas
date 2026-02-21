/**
 * Deploy V4 Contracts with new wallet
 * 
 * Usage: 
 *   node scripts/deploy-v4-new.js
 *   # It will show you the wallet address to fund
 *   # After funding, press Enter to continue
 */

const { ethers } = require('ethers');
const readline = require('readline');

// Existing contracts on Base Sepolia
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

async function getGasOpts(provider, gasLimit = 3000000) {
  const feeData = await provider.getFeeData();
  return {
    gasLimit,
    maxFeePerGas: feeData.maxFeePerGas.mul(2),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.mul(2)
  };
}

const wait = (ms = 2000) => new Promise(r => setTimeout(r, ms));

function question(rl, prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  console.log('='.repeat(60));
  console.log('Veritas Protocol V4 Deployment');
  console.log('='.repeat(60) + '\n');

  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  
  // Create new wallet
  const wallet = ethers.Wallet.createRandom();
  console.log('🔑 New Wallet Generated:');
  console.log(`   Address: ${wallet.address}`);
  console.log(`   Private Key: ${wallet.privateKey}`);
  console.log('\n⚠️  Save the private key securely!\n');

  const fundedWallet = wallet.connect(provider);
  
  // Check balance
  let balance = await fundedWallet.getBalance();
  console.log(`💰 Current Balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  // Wait for funding
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  while (balance.lt(ethers.utils.parseEther('0.005'))) {
    console.log('\n📥 Send at least 0.01 ETH to the address above on Base Sepolia');
    console.log('   Faucets:');
    console.log('   - https://faucet.circle.com/');
    console.log('   - https://www.alchemy.com/faucets/base-sepolia');
    
    await question(rl, '\n   Press Enter after funding...');
    
    balance = await fundedWallet.getBalance();
    console.log(`\n💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
  }
  
  rl.close();
  
  console.log('\n✅ Sufficient balance! Starting deployment...\n');
  await wait();

  // Load artifacts
  const RegistryV4 = require('../artifacts/contracts/VeritasValidationRegistryV4.sol/VeritasValidationRegistryV4.json');
  const AppV4 = require('../artifacts/contracts/PrimusVeritasAppV4.sol/PrimusVeritasAppV4.json');

  // ============================================
  // STEP 1: Deploy ValidationRegistryV4
  // ============================================
  console.log('STEP 1: Deploying VeritasValidationRegistryV4...');
  
  const registryFactory = new ethers.ContractFactory(RegistryV4.abi, RegistryV4.bytecode, fundedWallet);
  const registry = await registryFactory.deploy(IDENTITY_REGISTRY, await getGasOpts(provider));
  console.log(`  Tx: ${registry.deployTransaction.hash}`);
  await registry.deployed();
  console.log(`  ✅ ValidationRegistryV4: ${registry.address}\n`);

  await wait();

  // ============================================
  // STEP 2: Deploy PrimusVeritasAppV4
  // ============================================
  console.log('STEP 2: Deploying PrimusVeritasAppV4...');
  
  const appFactory = new ethers.ContractFactory(AppV4.abi, AppV4.bytecode, fundedWallet);
  const app = await appFactory.deploy(
    registry.address,
    PRIMUS_TASK,
    IDENTITY_REGISTRY,
    REPUTATION_REGISTRY,
    await getGasOpts(provider)
  );
  console.log(`  Tx: ${app.deployTransaction.hash}`);
  await app.deployed();
  console.log(`  ✅ PrimusVeritasAppV4: ${app.address}\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60));
  console.log('✅ DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  
  console.log('\n📦 Deployed Contracts:');
  console.log(`   ValidationRegistryV4: ${registry.address}`);
  console.log(`   PrimusVeritasAppV4:   ${app.address}`);
  
  console.log('\n🔗 Existing Contracts (Base Sepolia):');
  console.log(`   IdentityRegistry:     ${IDENTITY_REGISTRY}`);
  console.log(`   ReputationRegistry:   ${REPUTATION_REGISTRY}`);
  console.log(`   PrimusTask:           ${PRIMUS_TASK}`);
  
  console.log('\n📝 Environment Variables:');
  console.log(`   VERITAS_APP_V4=${app.address}`);
  console.log(`   VERITAS_REGISTRY_V4=${registry.address}`);
  
  console.log('\n🔐 Wallet Info:');
  console.log(`   Address: ${wallet.address}`);
  console.log(`   Private Key: ${wallet.privateKey}`);
}

main().catch(console.error);
