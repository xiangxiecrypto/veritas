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
  const registry = await registryFactory.deploy({ 
    gasLimit: 3000000,
    maxFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('0.5', 'gwei')
  });
  console.log(`  Tx: ${registry.deployTransaction.hash}`);
  await registry.deployed();
  console.log(`  ✅ ValidationRegistryV3: ${registry.address}\n`);

  // Wait a bit between deployments
  await new Promise(r => setTimeout(r, 3000));

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
    { 
      gasLimit: 3000000,
      maxFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('0.5', 'gwei')
    }
  );
  console.log(`  Tx: ${app.deployTransaction.hash}`);
  await app.deployed();
  console.log(`  ✅ PrimusVeritasAppV3: ${app.address}\n`);

  await new Promise(r => setTimeout(r, 3000));

  // ============================================
  // STEP 3: Deploy check contracts
  // ============================================
  console.log('STEP 3: Deploying check contracts...');
  
  await new Promise(r => setTimeout(r, 3000));
  
  // PriceRangeCheck
  const priceRangeFactory = new ethers.ContractFactory(PriceRangeCheck.abi, PriceRangeCheck.bytecode, wallet);
  const priceRangeCheck = await priceRangeFactory.deploy({ 
    gasLimit: 1000000,
    maxFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('0.5', 'gwei')
  });
  await priceRangeCheck.deployed();
  console.log(`  ✅ PriceRangeCheck: ${priceRangeCheck.address}`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // ThresholdCheck
  const thresholdFactory = new ethers.ContractFactory(ThresholdCheck.abi, ThresholdCheck.bytecode, wallet);
  const thresholdCheck = await thresholdFactory.deploy({ 
    gasLimit: 1000000,
    maxFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('0.5', 'gwei')
  });
  await thresholdCheck.deployed();
  console.log(`  ✅ ThresholdCheck: ${thresholdCheck.address}\n`);

  // ============================================
  // STEP 4: Add rule
  // ============================================
  console.log('STEP 4: Adding BTC/USD rule...');
  
  await new Promise(r => setTimeout(r, 3000));
  
  const addRuleTx = await app.addRule(
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    'btcPrice',
    2,    // decimals
    3600, // maxAge 1 hour
    'BTC/USD from Coinbase',
    { 
      gasLimit: 300000,
      maxFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('0.5', 'gwei')
    }
  );
  await addRuleTx.wait();
  console.log(`  ✅ Rule 0 added\n`);

  // ============================================
  // STEP 5: Add custom checks
  // ============================================
  console.log('STEP 5: Adding custom checks...');
  
  // Transfer ownership of registry to app (or keep separate)
  // For now, let's add checks directly from registry owner
  
  // Check 0: Price range $50,000 - $100,000 (score 100)
  const check0Params = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [5000000, 10000000]  // 50000.00 - 100000.00 (scaled by 100)
  );
  
  const addCheck0Tx = await registry.addCheck(
    0,  // ruleId
    priceRangeCheck.address,
    check0Params,
    100,  // score
    'Price range 50k-100k',
    { gasLimit: 300000 }
  );
  await addCheck0Tx.wait();
  console.log(`  ✅ Check 0: PriceRange(50k-100k) → score 100`);
  
  // Check 1: Threshold >= $60,000 (score 50)
  const check1Params = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'bool'],
    [6000000, true]  // 60000.00, >=
  );
  
  const addCheck1Tx = await registry.addCheck(
    0,  // ruleId
    thresholdCheck.address,
    check1Params,
    50,  // score
    'Price >= 60k',
    { gasLimit: 300000 }
  );
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
  console.log('Test with:');
  console.log(`  app.requestVerification(0, agentId, [0, 1])`);
  console.log('  SDK.attest()');
  console.log(`  app.submitAttestation(...)`);
  
  console.log('\nEnvironment variables:');
  console.log(`  VERITAS_APP_V3=${app.address}`);
  console.log(`  VERITAS_REGISTRY_V3=${registry.address}`);
}

main().catch(console.error);
