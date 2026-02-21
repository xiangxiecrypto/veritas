/**
 * Deploy and test V3 contracts with custom checks
 * 
 * Usage: PRIVATE_KEY=0x... node scripts/deploy-v3.js
 */

const { ethers } = require('ethers');

// Base Sepolia addresses
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';

// Get dynamic gas options
async function getGasOpts(provider, gasLimit = 3000000) {
  const feeData = await provider.getFeeData();
  return {
    gasLimit,
    maxFeePerGas: feeData.maxFeePerGas.mul(2), // 2x current
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.mul(2)
  };
}

// Wait between transactions
const wait = (ms = 3000) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('='.repeat(60));
  console.log('Deploying Veritas Protocol V3');
  console.log('='.repeat(60) + '\n');

  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('ERROR: PRIVATE_KEY environment variable required');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deployer: ${wallet.address}\n`);

  // Load contract artifacts
  const RegistryV3 = require('../artifacts/contracts/VeritasValidationRegistryV3.sol/VeritasValidationRegistryV3.json');
  const AppV3 = require('../artifacts/contracts/PrimusVeritasAppV3.sol/PrimusVeritasAppV3.json');
  const PriceRangeCheck = require('../artifacts/contracts/checks/PriceRangeCheck.sol/PriceRangeCheck.json');
  const ThresholdCheck = require('../artifacts/contracts/checks/ThresholdCheck.sol/ThresholdCheck.json');

  // ============================================
  // STEP 1: Deploy ValidationRegistryV3
  // ============================================
  console.log('STEP 1: Deploying ValidationRegistryV3...');
  
  const registryFactory = new ethers.ContractFactory(RegistryV3.abi, RegistryV3.bytecode, wallet);
  const registry = await registryFactory.deploy(await getGasOpts(provider));
  console.log(`  Tx: ${registry.deployTransaction.hash}`);
  await registry.deployed();
  console.log(`  ✅ ValidationRegistryV3: ${registry.address}\n`);

  await wait();

  // ============================================
  // STEP 2: Deploy AppV3
  // ============================================
  console.log('STEP 2: Deploying PrimusVeritasAppV3...');
  
  const appFactory = new ethers.ContractFactory(AppV3.abi, AppV3.bytecode, wallet);
  const app = await appFactory.deploy(
    PRIMUS_TASK,
    registry.address,
    REPUTATION_REGISTRY,
    IDENTITY_REGISTRY,
    await getGasOpts(provider)
  );
  console.log(`  Tx: ${app.deployTransaction.hash}`);
  await app.deployed();
  console.log(`  ✅ PrimusVeritasAppV3: ${app.address}\n`);

  await wait();

  // ============================================
  // STEP 3: Deploy check contracts
  // ============================================
  console.log('STEP 3: Deploying check contracts...');
  
  // PriceRangeCheck
  const priceRangeFactory = new ethers.ContractFactory(PriceRangeCheck.abi, PriceRangeCheck.bytecode, wallet);
  const priceRangeCheck = await priceRangeFactory.deploy(await getGasOpts(provider, 1000000));
  await priceRangeCheck.deployed();
  console.log(`  ✅ PriceRangeCheck: ${priceRangeCheck.address}`);
  
  await wait();
  
  // ThresholdCheck
  const thresholdFactory = new ethers.ContractFactory(ThresholdCheck.abi, ThresholdCheck.bytecode, wallet);
  const thresholdCheck = await thresholdFactory.deploy(await getGasOpts(provider, 1000000));
  await thresholdCheck.deployed();
  console.log(`  ✅ ThresholdCheck: ${thresholdCheck.address}\n`);

  // ============================================
  // STEP 4: Transfer ownership
  // ============================================
  console.log('STEP 4: Transferring registry ownership to app...');
  
  const transferTx = await registry.transferOwnership(app.address, await getGasOpts(provider, 100000));
  console.log(`  Tx: ${transferTx.hash}`);
  await transferTx.wait();
  console.log(`  ✅ Ownership transferred\n`);

  await wait();

  // ============================================
  // STEP 5: Add rule
  // ============================================
  console.log('STEP 5: Adding BTC/USD rule...');
  
  const addRuleTx = await app.addRule(
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    'btcPrice',
    2,    // decimals
    3600, // maxAge 1 hour
    'BTC/USD from Coinbase',
    await getGasOpts(provider, 300000)
  );
  console.log(`  Tx: ${addRuleTx.hash}`);
  await addRuleTx.wait();
  console.log(`  ✅ Rule 0 added\n`);

  await wait();

  // ============================================
  // STEP 6: Add custom checks
  // ============================================
  console.log('STEP 6: Adding custom checks...');
  
  // Check 0: Price range $50,000 - $100,000 (score 100)
  const check0Params = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [5000000, 10000000]  // 50000.00 - 100000.00 (scaled by 100)
  );
  
  const addCheck0Tx = await app.addCheck(
    0,  // ruleId
    priceRangeCheck.address,
    check0Params,
    100,  // score
    'Price range 50k-100k',
    await getGasOpts(provider, 300000)
  );
  console.log(`  Tx: ${addCheck0Tx.hash}`);
  await addCheck0Tx.wait();
  console.log(`  ✅ Check 0: PriceRange(50k-100k) → score 100`);
  
  await wait();
  
  // Check 1: Threshold >= $60,000 (score 50)
  const check1Params = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'bool'],
    [6000000, true]  // 60000.00, >=
  );
  
  const addCheck1Tx = await app.addCheck(
    0,  // ruleId
    thresholdCheck.address,
    check1Params,
    50,  // score
    'Price >= 60k',
    await getGasOpts(provider, 300000)
  );
  console.log(`  Tx: ${addCheck1Tx.hash}`);
  await addCheck1Tx.wait();
  console.log(`  ✅ Check 1: Threshold(>=60k) → score 50\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  
  console.log('\nDeployed Contracts:');
  console.log(`  ValidationRegistryV3: ${registry.address}`);
  console.log(`  PrimusVeritasAppV3:   ${app.address}`);
  console.log(`  PriceRangeCheck:      ${priceRangeCheck.address}`);
  console.log(`  ThresholdCheck:       ${thresholdCheck.address}`);
  
  console.log('\nRule 0: BTC/USD');
  console.log('  Check 0: Price 50k-100k → score 100');
  console.log('  Check 1: Price >= 60k   → score 50');
  console.log('  Total possible: 150');
  
  console.log('\n---');
  console.log('Environment variables:');
  console.log(`  VERITAS_APP_V3=${app.address}`);
  console.log(`  VERITAS_REGISTRY_V3=${registry.address}`);
}

main().catch(console.error);
