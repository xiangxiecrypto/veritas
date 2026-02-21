/**
 * Setup V4 Rules and Checks with URLs (fixed nonce)
 */

const { ethers } = require('ethers');

// Deployed V4 contracts
const APP = '0x8C2185d3C7D4458Eb379E67eaBff056A8D4E1aeB';
const PRICERANGE_CHECK = '0xDddA3357B14003c436495dE5C02ecBde38473f70'; // Already deployed

// Primus URLs
const COINBASE_BTC_URL = 'https://api.coinbase.com/v2/exchange-rates?currency=BTC';
const COINBASE_ETH_URL = 'https://api.coinbase.com/v2/exchange-rates?currency=ETH';

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('ERROR: PRIVATE_KEY not set');
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(pk, provider);
  
  console.log('Deployer:', wallet.address);
  const balance = await wallet.getBalance();
  console.log('Balance:', ethers.utils.formatEther(balance), 'ETH\n');

  const AppABI = require('../artifacts/contracts/PrimusVeritasAppV4.sol/PrimusVeritasAppV4.json').abi;
  const ThresholdCheckABI = require('../artifacts/contracts/ThresholdCheck.sol/ThresholdCheck.json').abi;
  const ThresholdCheckBytecode = require('../artifacts/contracts/ThresholdCheck.sol/ThresholdCheck.json').bytecode;

  const app = new ethers.Contract(APP, AppABI, wallet);

  // ============================================
  // STEP 1: Deploy ThresholdCheck
  // ============================================
  console.log('STEP 1: Deploying ThresholdCheck...');
  const nonce1 = await provider.getTransactionCount(wallet.address);
  console.log('  Current nonce:', nonce1);
  
  const thresholdFactory = new ethers.ContractFactory(ThresholdCheckABI, ThresholdCheckBytecode, wallet);
  const thresholdCheck = await thresholdFactory.deploy({ nonce: nonce1 });
  console.log('  Tx:', thresholdCheck.deployTransaction.hash);
  await thresholdCheck.deployed();
  console.log('  ✅ ThresholdCheck:', thresholdCheck.address, '\n');

  // ============================================
  // STEP 2: Add BTC Price Rule (with URL)
  // ============================================
  console.log('STEP 2: Adding BTC Price Rule...');
  console.log('  URL:', COINBASE_BTC_URL);
  
  const nonce2 = await provider.getTransactionCount(wallet.address);
  console.log('  Current nonce:', nonce2);
  
  const btcRuleTx = await app.addRule(
    COINBASE_BTC_URL,         // templateId: URL for Primus to attest
    'data.rates.USD',         // dataKey: JSON path to extract BTC/USD price
    2,                        // decimals: 2 (price in cents)
    3600,                     // maxAge: 1 hour
    'BTC/USD price from Coinbase', // description
    { nonce: nonce2 }
  );
  console.log('  Tx:', btcRuleTx.hash);
  await btcRuleTx.wait();
  console.log('  ✅ BTC Rule added (ruleId: 0)\n');

  // ============================================
  // STEP 3: Add Price Range Check for BTC
  // ============================================
  console.log('STEP 3: Adding Price Range Check for BTC...');
  
  const nonce3 = await provider.getTransactionCount(wallet.address);
  console.log('  Current nonce:', nonce3);
  
  // Range: $60,000 - $100,000 (in cents: 6000000 - 10000000)
  const rangeParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]  // minPrice, maxPrice (in cents)
  );
  
  const btcCheckTx = await app.addCheck(
    0,                          // ruleId: 0 (BTC rule)
    PRICERANGE_CHECK,           // checkContract (already deployed)
    rangeParams,                // params
    100,                        // score: 100 points
    { nonce: nonce3 }
  );
  console.log('  Tx:', btcCheckTx.hash);
  await btcCheckTx.wait();
  console.log('  ✅ BTC Price Range Check added\n');

  // ============================================
  // STEP 4: Add ETH Price Rule (with URL)
  // ============================================
  console.log('STEP 4: Adding ETH Price Rule...');
  console.log('  URL:', COINBASE_ETH_URL);
  
  const nonce4 = await provider.getTransactionCount(wallet.address);
  console.log('  Current nonce:', nonce4);
  
  const ethRuleTx = await app.addRule(
    COINBASE_ETH_URL,        // templateId: URL for Primus to attest
    'data.rates.USD',        // dataKey: JSON path to extract ETH/USD price
    2,                       // decimals: 2 (price in cents)
    3600,                    // maxAge: 1 hour
    'ETH/USD price from Coinbase', // description
    { nonce: nonce4 }
  );
  console.log('  Tx:', ethRuleTx.hash);
  await ethRuleTx.wait();
  console.log('  ✅ ETH Rule added (ruleId: 1)\n');

  // ============================================
  // STEP 5: Add Threshold Check for ETH
  // ============================================
  console.log('STEP 5: Adding Threshold Check for ETH...');
  
  const nonce5 = await provider.getTransactionCount(wallet.address);
  console.log('  Current nonce:', nonce5);
  
  // Expected: $3,500, max deviation: 5% (500 basis points)
  const thresholdParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [350000, 500]  // expectedValue (in cents), maxDeviationBps (5%)
  );
  
  const ethCheckTx = await app.addCheck(
    1,                          // ruleId: 1 (ETH rule)
    thresholdCheck.address,     // checkContract
    thresholdParams,            // params
    50,                         // score: 50 points
    { nonce: nonce5 }
  );
  console.log('  Tx:', ethCheckTx.hash);
  await ethCheckTx.wait();
  console.log('  ✅ ETH Threshold Check added\n');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60));
  console.log('SETUP COMPLETE');
  console.log('='.repeat(60));
  
  console.log('\n📦 Check Contracts:');
  console.log(`   PriceRangeCheck: ${PRICERANGE_CHECK}`);
  console.log(`   ThresholdCheck:  ${thresholdCheck.address}`);
  
  console.log('\n📋 Rules (with URLs):');
  console.log(`   Rule 0 (BTC): ${COINBASE_BTC_URL}`);
  console.log(`   Rule 1 (ETH): ${COINBASE_ETH_URL}`);
  
  console.log('\n✅ Checks:');
  console.log('   BTC: PriceRangeCheck ($60,000 - $100,000)');
  console.log('   ETH: ThresholdCheck (expected $3,500, max 5% deviation)');
}

main().catch(console.error);
