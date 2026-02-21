/**
 * Add V2 Checks to App and Test Complete Flow
 */

const { ethers } = require('ethers');

// Deployed contracts
const APP_ADDRESS = '0x8C2185d3C7D4458Eb379E67eaBff056A8D4E1aeB';
const PRICE_RANGE_V2 = '0x91ce67B719fB850e6C233aCCae2c5079282c1321';
const THRESHOLD_V2 = '0x8019599933843bE5702861f784708D12A6a8535F';

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('ERROR: PRIVATE_KEY not set');
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(pk, provider);

  console.log('='.repeat(60));
  console.log('Add V2 Checks to App');
  console.log('='.repeat(60));
  console.log('\nDeployer:', wallet.address);
  const balance = await wallet.getBalance();
  console.log('Balance:', ethers.utils.formatEther(balance), 'ETH\n');

  const AppABI = require('../artifacts/contracts/PrimusVeritasAppV4.sol/PrimusVeritasAppV4.json').abi;
  const app = new ethers.Contract(APP_ADDRESS, AppABI, wallet);

  // Check current state
  console.log('CURRENT STATE');
  console.log('-'.repeat(40));
  const ruleCount = await app.ruleCount();
  const btcChecks = await app.checkCount(0);
  const ethChecks = await app.checkCount(1);
  console.log('Rules:', ruleCount.toString());
  console.log('BTC Checks (rule 0):', btcChecks.toString());
  console.log('ETH Checks (rule 1):', ethChecks.toString());
  console.log('');

  // ============================================
  // STEP 1: Add PriceRangeCheckV2 to BTC Rule
  // ============================================
  console.log('STEP 1: Add PriceRangeCheckV2 to BTC Rule');
  console.log('-'.repeat(40));

  // Range: $60,000 - $100,000 (in cents)
  const btcRangeParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]  // $60k - $100k in cents
  );

  const btcCheckTx = await app.addCheck(
    0,                      // ruleId: BTC rule
    PRICE_RANGE_V2,         // check contract
    btcRangeParams,         // params: min/max price
    100                     // score: 100 points
  );
  console.log('  Tx:', btcCheckTx.hash);
  await btcCheckTx.wait();
  console.log('  ✅ Added PriceRangeCheckV2 to BTC rule\n');

  // ============================================
  // STEP 2: Add ThresholdCheckV2 to ETH Rule
  // ============================================
  console.log('STEP 2: Add ThresholdCheckV2 to ETH Rule');
  console.log('-'.repeat(40));

  // Expected: $2,700, max deviation: 10% (1000 basis points)
  // Using current ETH price ~$2,700 as expected
  const ethThresholdParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [270000, 1000]  // expectedValue ($2,700 in cents), maxDeviationBps (10%)
  );

  const ethCheckTx = await app.addCheck(
    1,                      // ruleId: ETH rule
    THRESHOLD_V2,           // check contract
    ethThresholdParams,     // params: expected/max deviation
    50                      // score: 50 points
  );
  console.log('  Tx:', ethCheckTx.hash);
  await ethCheckTx.wait();
  console.log('  ✅ Added ThresholdCheckV2 to ETH rule\n');

  // ============================================
  // STEP 3: Verify New State
  // ============================================
  console.log('STEP 3: Verify New State');
  console.log('-'.repeat(40));
  
  const newBtcChecks = await app.checkCount(0);
  const newEthChecks = await app.checkCount(1);
  console.log('BTC Checks:', btcChecks.toString(), '→', newBtcChecks.toString());
  console.log('ETH Checks:', ethChecks.toString(), '→', newEthChecks.toString());
  console.log('');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60));
  console.log('SETUP COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('BTC Rule (0):');
  console.log('  URL: https://api.coinbase.com/v2/exchange-rates?currency=BTC');
  console.log('  Check: PriceRangeCheckV2');
  console.log('  Params: $60,000 - $100,000');
  console.log('  Score: 100');
  console.log('');
  console.log('ETH Rule (1):');
  console.log('  URL: https://api.coinbase.com/v2/exchange-rates?currency=ETH');
  console.log('  Check: ThresholdCheckV2');
  console.log('  Params: Expected $2,700, max 10% deviation');
  console.log('  Score: 50');
  console.log('');
  console.log('CONTRACTS:');
  console.log('  App:', APP_ADDRESS);
  console.log('  PriceRangeCheckV2:', PRICE_RANGE_V2);
  console.log('  ThresholdCheckV2:', THRESHOLD_V2);
  console.log('');
}

main().catch(console.error);
