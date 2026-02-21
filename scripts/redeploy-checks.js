/**
 * Redeploy Check Contracts and Update Rules
 */

const { ethers } = require('ethers');

const APP = '0x8C2185d3C7D4458Eb379E67eaBff056A8D4E1aeB';
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
  const PriceRangeCheckABI = require('../artifacts/contracts/PriceRangeCheck.sol/PriceRangeCheck.json').abi;
  const PriceRangeCheckBytecode = require('../artifacts/contracts/PriceRangeCheck.sol/PriceRangeCheck.json').bytecode;
  const ThresholdCheckABI = require('../artifacts/contracts/ThresholdCheck.sol/ThresholdCheck.json').abi;
  const ThresholdCheckBytecode = require('../artifacts/contracts/ThresholdCheck.sol/ThresholdCheck.json').bytecode;

  const app = new ethers.Contract(APP, AppABI, wallet);

  // Deploy PriceRangeCheck
  console.log('Deploying PriceRangeCheck...');
  const priceRangeFactory = new ethers.ContractFactory(PriceRangeCheckABI, PriceRangeCheckBytecode, wallet);
  const priceRangeCheck = await priceRangeFactory.deploy();
  console.log('  Tx:', priceRangeCheck.deployTransaction.hash);
  await priceRangeCheck.deployed();
  console.log('  ✅ PriceRangeCheck:', priceRangeCheck.address, '\n');

  // Deploy ThresholdCheck
  console.log('Deploying ThresholdCheck...');
  const thresholdFactory = new ethers.ContractFactory(ThresholdCheckABI, ThresholdCheckBytecode, wallet);
  const thresholdCheck = await thresholdFactory.deploy();
  console.log('  Tx:', thresholdCheck.deployTransaction.hash);
  await thresholdCheck.deployed();
  console.log('  ✅ ThresholdCheck:', thresholdCheck.address, '\n');

  // Add BTC Price Range Check
  console.log('Adding BTC Price Range Check...');
  const rangeParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]  // $60k - $100k in cents
  );
  
  const btcCheckTx = await app.addCheck(0, priceRangeCheck.address, rangeParams, 100);
  console.log('  Tx:', btcCheckTx.hash);
  await btcCheckTx.wait();
  console.log('  ✅ BTC Price Range Check added\n');

  // Add ETH Threshold Check
  console.log('Adding ETH Threshold Check...');
  const thresholdParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [200000, 500]  // expected $2,000, max 5% deviation
  );
  
  const ethCheckTx = await app.addCheck(1, thresholdCheck.address, thresholdParams, 50);
  console.log('  Tx:', ethCheckTx.hash);
  await ethCheckTx.wait();
  console.log('  ✅ ETH Threshold Check added\n');

  console.log('='.repeat(60));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log('\n📦 New Check Contracts:');
  console.log(`   PriceRangeCheck: ${priceRangeCheck.address}`);
  console.log(`   ThresholdCheck:  ${thresholdCheck.address}`);
}

main().catch(console.error);
