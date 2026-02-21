/**
 * Deploy V4 Contracts
 * 
 * Usage: PRIVATE_KEY=0x... node scripts/deploy-v4.js
 */

const { ethers } = require('ethers');

// Existing contracts on Base Sepolia
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

// Get dynamic gas options
async function getGasOpts(provider, gasLimit = 3000000) {
  const feeData = await provider.getFeeData();
  return {
    gasLimit,
    maxFeePerGas: feeData.maxFeePerGas.mul(2),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.mul(2)
  };
}

const wait = (ms = 3000) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('='.repeat(60));
  console.log('Deploying Veritas Protocol V4');
  console.log('='.repeat(60) + '\n');

  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('ERROR: PRIVATE_KEY environment variable required');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deployer: ${wallet.address}\n`);

  // Load artifacts
  const RegistryV4 = require('../artifacts/contracts/VeritasValidationRegistryV4.sol/VeritasValidationRegistryV4.json');
  const AppV4 = require('../artifacts/contracts/PrimusVeritasAppV4.sol/PrimusVeritasAppV4.json');

  // ============================================
  // STEP 1: Deploy ValidationRegistryV4
  // ============================================
  console.log('STEP 1: Deploying VeritasValidationRegistryV4...');
  
  const registryFactory = new ethers.ContractFactory(RegistryV4.abi, RegistryV4.bytecode, wallet);
  const registry = await registryFactory.deploy(IDENTITY_REGISTRY, await getGasOpts(provider));
  console.log(`  Tx: ${registry.deployTransaction.hash}`);
  await registry.deployed();
  console.log(`  ✅ ValidationRegistryV4: ${registry.address}\n`);

  await wait();

  // ============================================
  // STEP 2: Deploy PrimusVeritasAppV4
  // ============================================
  console.log('STEP 2: Deploying PrimusVeritasAppV4...');
  
  const appFactory = new ethers.ContractFactory(AppV4.abi, AppV4.bytecode, wallet);
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
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  
  console.log('\nDeployed Contracts:');
  console.log(`  ValidationRegistryV4: ${registry.address}`);
  console.log(`  PrimusVeritasAppV4:   ${app.address}`);
  
  console.log('\nExisting Contracts (Base Sepolia):');
  console.log(`  IdentityRegistry:     ${IDENTITY_REGISTRY}`);
  console.log(`  ReputationRegistry:   ${REPUTATION_REGISTRY}`);
  console.log(`  PrimusTask:           ${PRIMUS_TASK}`);
  
  console.log('\n---');
  console.log('Environment variables:');
  console.log(`  VERITAS_APP_V4=${app.address}`);
  console.log(`  VERITAS_REGISTRY_V4=${registry.address}`);
}

main().catch(console.error);
