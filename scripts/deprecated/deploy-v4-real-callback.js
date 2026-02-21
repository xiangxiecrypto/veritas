/**
 * Deploy V4 App with Real Primus Callback Support
 * 
 * This version accepts callbacks directly from the real Primus attestor
 */

const { ethers } = require("ethers");

const CHAIN_ID = 84532;
const RPC_URL = 'https://sepolia.base.org';
const EXPLORER = 'https://sepolia.basescan.org';

// Existing contracts
const REGISTRY_ADDRESS = '0x257DC4B38066840769EeA370204AD3724ddb0836';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const PRICE_RANGE_V2 = '0x91ce67B719fB850e6C233aCCae2c5079282c1321';
const THRESHOLD_V2 = '0x8019599933843bE5702861f784708D12A6a8535F';

// Real Primus attestor on Base Sepolia
const PRIMUS_ATTESTOR = '0x0DE886e31723e64Aa72e51977B14475fB66a9f72';

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('ERROR: PRIVATE_KEY not set');
    process.exit(1);
  }

  console.log('\n');
  console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         DEPLOY V4 APP WITH REAL PRIMUS CALLBACK                                     ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(pk, provider);

  console.log('Deployer:', wallet.address);
  console.log('Balance:', ethers.utils.formatEther(await wallet.getBalance()), 'ETH');
  console.log('');

  // Load artifacts
  const AppRealArtifact = require('../artifacts/contracts/PrimusVeritasAppV4Real.sol/PrimusVeritasAppV4Real.json');

  // ==========================================================================
  // STEP 1: Deploy App
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY APP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const AppFactory = new ethers.ContractFactory(
    AppRealArtifact.abi,
    AppRealArtifact.bytecode,
    wallet
  );

  console.log('Deploying PrimusVeritasAppV4Real...');
  const app = await AppFactory.deploy(
    REGISTRY_ADDRESS,
    IDENTITY_REGISTRY,
    ethers.constants.AddressZero // No reputation registry for now
  );
  console.log('  Tx:', app.deployTransaction.hash);
  await app.deployed();
  console.log('  ✅ App:', app.address);
  console.log('  Explorer:', EXPLORER + '/address/' + app.address);
  console.log('');

  // Verify configuration
  console.log('Configuration:');
  console.log('  Registry:', await app.registry());
  console.log('  Identity:', await app.identityRegistry());
  console.log('  Primus Attestor:', await app.PRIMUS_ATTESTOR());
  console.log('');

  // ==========================================================================
  // STEP 2: Configure Rules
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: CONFIGURE RULES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Add BTC Rule
  console.log('Adding BTC Rule...');
  let tx = await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "data.rates.USD",
    2,  // decimals
    3600, // maxAge (1 hour)
    "Coinbase BTC/USD exchange rate"
  );
  console.log('  Tx:', tx.hash);
  await tx.wait();
  console.log('  ✅ BTC Rule added (ruleId: 0)');
  console.log('');

  // Add PriceRangeCheck for BTC
  console.log('Adding PriceRangeCheck for BTC...');
  const btcRangeParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]  // $60k - $100k
  );
  tx = await app.addCheck(0, PRICE_RANGE_V2, btcRangeParams, 100);
  console.log('  Tx:', tx.hash);
  await tx.wait();
  console.log('  ✅ PriceRangeCheck added (checkId: 0)');
  console.log('');

  // Add ETH Rule
  console.log('Adding ETH Rule...');
  tx = await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
    "data.rates.USD",
    2,  // decimals
    3600, // maxAge (1 hour)
    "Coinbase ETH/USD exchange rate"
  );
  console.log('  Tx:', tx.hash);
  await tx.wait();
  console.log('  ✅ ETH Rule added (ruleId: 1)');
  console.log('');

  // Add ThresholdCheck for ETH
  console.log('Adding ThresholdCheck for ETH...');
  const ethThresholdParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [270000, 1000]  // $2,700 expected, 10% max deviation
  );
  tx = await app.addCheck(1, THRESHOLD_V2, ethThresholdParams, 50);
  console.log('  Tx:', tx.hash);
  await tx.wait();
  console.log('  ✅ ThresholdCheck added (checkId: 0)');
  console.log('');

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DEPLOYMENT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('Deployed Contract:');
  console.log('  PrimusVeritasAppV4Real:', app.address);
  console.log('');

  console.log('Configuration:');
  console.log('  Registry:', REGISTRY_ADDRESS);
  console.log('  Identity Registry:', IDENTITY_REGISTRY);
  console.log('  Primus Attestor:', PRIMUS_ATTESTOR);
  console.log('');

  console.log('Rules:');
  console.log('  0: BTC/USD from Coinbase');
  console.log('  1: ETH/USD from Coinbase');
  console.log('');

  console.log('Checks:');
  console.log('  BTC: PriceRangeCheckV2 ($60k-$100k)');
  console.log('  ETH: ThresholdCheckV2 (10% deviation from $2,700)');
  console.log('');

  console.log('Explorer:');
  console.log('  ' + EXPLORER + '/address/' + app.address);
  console.log('');

  console.log('Next Step:');
  console.log('  Test real Primus SDK callback to receiveAttestation()');
  console.log('');

  console.log('╔═════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     V4 APP WITH REAL PRIMUS CALLBACK DEPLOYED! ✅                                    ║');
  console.log('╚═════════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Return app address for next step
  console.log('APP_ADDRESS=' + app.address);
}

main().catch(console.error);
