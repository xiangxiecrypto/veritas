/**
 * @fileoverview Deployment script for Veritas Neat Protocol
 * @description Deploys all contracts and creates sample rules
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('=================================================');
  console.log('  Veritas Neat Protocol - Deployment');
  console.log('=================================================\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // ========================================
  // 1. Deploy RuleRegistry
  // ========================================
  console.log('1. Deploying RuleRegistry...');
  const RuleRegistryFactory = await ethers.getContractFactory('RuleRegistry');
  const ruleRegistry = await RuleRegistryFactory.deploy();
  await ruleRegistry.waitForDeployment();
  const ruleRegistryAddress = await ruleRegistry.getAddress();
  console.log('   ✅ RuleRegistry:', ruleRegistryAddress);

  // ========================================
  // 2. Deploy HTTPCheck
  // ========================================
  console.log('\n2. Deploying HTTPCheck...');
  const HTTPCheckFactory = await ethers.getContractFactory('HTTPCheck');
  const httpCheck = await HTTPCheckFactory.deploy();
  await httpCheck.waitForDeployment();
  const httpCheckAddress = await httpCheck.getAddress();
  console.log('   ✅ HTTPCheck:', httpCheckAddress);

  // ========================================
  // 3. Deploy VeritasValidator
  // ========================================
  console.log('\n3. Deploying VeritasValidator...');
  const VeritasValidatorFactory = await ethers.getContractFactory('VeritasValidator');
  
  // Use deployer's address as mock Primus
  const validator = await VeritasValidatorFactory.deploy(
    ruleRegistryAddress,
    deployer.address
  );
  await validator.waitForDeployment();
  const validatorAddress = await validator.getAddress();
  console.log('   ✅ VeritasValidator:', validatorAddress);
  console.log('      Mock Primus:', deployer.address);

  // ========================================
  // 4. Create Sample Rules
  // ========================================
  console.log('\n4. Creating sample rules...');

  // Rule 1: Trading API - POST
  const checkData1 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    [
      'https://api.trading.com/orders',
      'POST',
      200,
      201,
      '0x',
      true
    ]
  );

  const tx1 = await ruleRegistry.createRule(
    'Trading Orders - Create',
    'Validate order creation calls',
    httpCheckAddress,
    checkData1
  );
  await tx1.wait();
  console.log('   ✅ Rule 1 created (ID: 1)');

  // Rule 2: Market Data API - GET
  const checkData2 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    [
      'https://api.market.com/*',
      'GET',
      200,
      299,
      ethers.toUtf8Bytes('"price":'),
      true
    ]
  );

  const tx2 = await ruleRegistry.createRule(
    'Market Data - Get',
    'Validate market data retrieval',
    httpCheckAddress,
    checkData2
  );
  await tx2.wait();
  console.log('   ✅ Rule 2 created (ID: 2)');

  // Rule 3: General API - GET
  const checkData3 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    [
      'https://api.example.com/*',
      'GET',
      200,
      299,
      '0x',
      false  // No parsePath validation
    ]
  );

  const tx3 = await ruleRegistry.createRule(
    'General API - Get',
    'Validate general GET requests',
    httpCheckAddress,
    checkData3
  );
  await tx3.wait();
  console.log('   ✅ Rule 3 created (ID: 3)');

  // ========================================
  // 5. Print Summary
  // ========================================
  console.log('\n========================================');
  console.log('  DEPLOYMENT COMPLETE');
  console.log('========================================\n');

  console.log('Contract Addresses:');
  console.log('--------------------');
  console.log(`  RuleRegistry:     ${ruleRegistryAddress}`);
  console.log(`  HTTPCheck:        ${httpCheckAddress}`);
  console.log(`  VeritasValidator: ${validatorAddress}`);
  console.log(`  Mock Primus:       ${deployer.address}`);

  console.log('\nSample Rules:');
  console.log('--------------');
  const ruleCount = await ruleRegistry.getRuleCount();
  for (let i = 1; i <= Number(ruleCount); i++) {
    const rule = await ruleRegistry.getRule(i);
    console.log(`  ${i}. ${rule.name}`);
    console.log(`     Description: ${rule.description}`);
    console.log(`     Active: ${rule.active}`);
    console.log(`     Check Contract: ${rule.checkContract}`);
  }

  // ========================================
  // 6. Deployment Info
  // ========================================
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ruleRegistry: ruleRegistryAddress,
      httpCheck: httpCheckAddress,
      veritasValidator: validatorAddress,
      primusMock: deployer.address,
    },
    rules: {
      count: Number(ruleCount),
      ids: [1, 2, 3]
    }
  };

  console.log('\nDeployment Info:');
  console.log('-----------------------');
  console.log('Network:', deploymentInfo.network);
  console.log('Timestamp:', deploymentInfo.timestamp);

  console.log('\n📝 Next Steps:');
  console.log('1. Update SDK with deployed addresses:');
  console.log(`   VALIDATOR_ADDRESS = '${validatorAddress}'`);
  console.log('');
  console.log('2. Create rules based on your requirements');
  console.log('3. Test attestations and validation');
  console.log('');
  console.log('4. Publish package: npm publish');
  console.log('');
  console.log('5. Update documentation with real Primus addresses');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
