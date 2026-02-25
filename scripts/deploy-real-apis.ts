/**
 * @fileoverview Deploy to Base Sepolia with Real APIs
 * @description Create rules for real, accessible APIs
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('=================================================');
  console.log('  Veritas Neat - Base Sepolia Deployment');
  console.log('  Real API Rules');
  console.log('  =================================================\n');

  const PRIMUS_ZKTLS_ADDRESS = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
  const [deployer] = await ethers.getSigners();
  
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Deploy contracts
  console.log('Deploying contracts...\n');

  const RuleRegistryFactory = await ethers.getContractFactory('RuleRegistry');
  const ruleRegistry = await RuleRegistryFactory.deploy();
  await ruleRegistry.waitForDeployment();
  console.log('✅ RuleRegistry:', await ruleRegistry.getAddress());

  const HTTPCheckFactory = await ethers.getContractFactory('HTTPCheck');
  const httpCheck = await HTTPCheckFactory.deploy();
  await httpCheck.waitForDeployment();
  console.log('✅ HTTPCheck:', await httpCheck.getAddress());

  const VeritasValidatorFactory = await ethers.getContractFactory('VeritasValidator');
  const validator = await VeritasValidatorFactory.deploy(
    await ruleRegistry.getAddress(),
    PRIMUS_ZKTLS_ADDRESS
  );
  await validator.waitForDeployment();
  console.log('✅ VeritasValidator:', await validator.getAddress());

  // Create rules for real APIs
  console.log('\nCreating rules for real APIs...\n');

  // Rule 1: CoinGecko API - ETH Price
  console.log('Rule 1: CoinGecko API - ETH Price');
  console.log('  API: https://api.coingecko.com/api/v3/*');
  console.log('  Method: GET');
  console.log('  Pattern: "usd" (ensures price data)');
  
  const checkData1 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    [
      'https://api.coingecko.com/api/v3/*',  // 通配符匹配所有端点
      'GET',
      200,
      299,
      ethers.toUtf8Bytes('"usd"'),  // 必须包含价格字段
      true  // Validate parsePath
    ]
  );

  const tx1 = await ruleRegistry.createRule(
    'CoinGecko - ETH Price',
    'Verify Ethereum price from CoinGecko',
    await httpCheck.getAddress(),
    checkData1
  );
  await tx1.wait();
  console.log('  ✅ Rule 1 created\n');

  // Rule 2: Binance API - BTC Price
  console.log('Rule 2: Binance API - BTC Price');
  console.log('  API: https://api.binance.com/api/v3/*');
  console.log('  Method: GET');
  console.log('  Pattern: "price" (ensures price data)');
  
  const checkData2 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    [
      'https://api.binance.com/api/v3/*',
      'GET',
      200,
      299,
      ethers.toUtf8Bytes('"price"'),  // 必须包含价格字段
      true
    ]
  );

  const tx2 = await ruleRegistry.createRule(
    'Binance - BTC Price',
    'Verify Bitcoin price from Binance',
    await httpCheck.getAddress(),
    checkData2
  );
  await tx2.wait();
  console.log('  ✅ Rule 2 created\n');

  // Rule 3: JSONPlaceholder - Create Post
  console.log('Rule 3: JSONPlaceholder - Create Post');
  console.log('  API: https://jsonplaceholder.typicode.com/*');
  console.log('  Method: POST');
  console.log('  Pattern: "id" (ensures resource created)');
  
  const checkData3 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    [
      'https://jsonplaceholder.typicode.com/*',
      'POST',
      200,
      201,
      ethers.toUtf8Bytes('"id"'),  // 必须包含 ID 字段
      true
    ]
  );

  const tx3 = await ruleRegistry.createRule(
    'JSONPlaceholder - Create',
    'Verify resource creation on JSONPlaceholder',
    await httpCheck.getAddress(),
    checkData3
  );
  await tx3.wait();
  console.log('  ✅ Rule 3 created\n');

  // Print summary
  console.log('=================================================');
  console.log('  DEPLOYMENT COMPLETE');
  console.log('  =================================================\n');

  console.log('Contract Addresses:');
  console.log('  RuleRegistry:    ', await ruleRegistry.getAddress());
  console.log('  HTTPCheck:       ', await httpCheck.getAddress());
  console.log('  VeritasValidator:', await validator.getAddress());
  console.log('  Primus ZKTLS:    ', PRIMUS_ZKTLS_ADDRESS);

  console.log('\nReal API Rules:');
  console.log('  1. CoinGecko - ETH Price (GET)');
  console.log('     URL: https://api.coingecko.com/api/v3/*');
  console.log('     Extract: ethereum.usd');
  console.log('');
  console.log('  2. Binance - BTC Price (GET)');
  console.log('     URL: https://api.binance.com/api/v3/*');
  console.log('     Extract: price');
  console.log('');
  console.log('  3. JSONPlaceholder - Create (POST)');
  console.log('     URL: https://jsonplaceholder.typicode.com/*');
  console.log('     Extract: id');

  console.log('\n📝 Test Commands:');
  console.log('  Test CoinGecko:');
  console.log('    url: https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
  console.log('');
  console.log('  Test Binance:');
  console.log('    url: https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
  console.log('');
  console.log('  Test JSONPlaceholder:');
  console.log('    url: https://jsonplaceholder.typicode.com/posts');
  console.log('    body: { title: "Test", body: "Content", userId: 1 }');

  console.log('\n✅ Ready for testing with real APIs!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
