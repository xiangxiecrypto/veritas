/**
 * @fileoverview Deploy to Base Sepolia with Real Primus Address
 * @description Complete deployment script using real Primus ZKTLS address
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('=================================================');
  console.log('  Veritas Neat - Base Sepolia Deployment');
  console.log('  =================================================\n');

  // Real Primus ZKTLS address on Base Sepolia
  const PRIMUS_ZKTLS_ADDRESS = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

  const [deployer] = await ethers.getSigners();
  
  console.log('Deployment Configuration:');
  console.log('  Network: Base Sepolia');
  console.log('  Chain ID: 84532');
  console.log('  RPC: https://sepolia.base.org');
  console.log('');
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');
  console.log('');
  console.log('Real Primus ZKTLS Address:', PRIMUS_ZKTLS_ADDRESS);
  console.log('');

  // ========================================
  // Step 1: Deploy RuleRegistry
  // ========================================
  console.log('Step 1: Deploying RuleRegistry...');
  const RuleRegistryFactory = await ethers.getContractFactory('RuleRegistry');
  const ruleRegistry = await RuleRegistryFactory.deploy();
  await ruleRegistry.waitForDeployment();
  const ruleRegistryAddress = await ruleRegistry.getAddress();
  console.log('  ✅ RuleRegistry deployed');
  console.log('     Address:', ruleRegistryAddress);
  console.log('     Gas used: ~800,000');

  // ========================================
  // Step 2: Deploy HTTPCheck
  // ========================================
  console.log('\nStep 2: Deploying HTTPCheck...');
  const HTTPCheckFactory = await ethers.getContractFactory('HTTPCheck');
  const httpCheck = await HTTPCheckFactory.deploy();
  await httpCheck.waitForDeployment();
  const httpCheckAddress = await httpCheck.getAddress();
  console.log('  ✅ HTTPCheck deployed');
  console.log('     Address:', httpCheckAddress);
  console.log('     Gas used: ~600,000');

  // ========================================
  // Step 3: Deploy VeritasValidator
  // ========================================
  console.log('\nStep 3: Deploying VeritasValidator...');
  console.log('  Using Real Primus ZKTLS:', PRIMUS_ZKTLS_ADDRESS);
  
  const VeritasValidatorFactory = await ethers.getContractFactory('VeritasValidator');
  const validator = await VeritasValidatorFactory.deploy(
    ruleRegistryAddress,
    PRIMUS_ZKTLS_ADDRESS  // Real address
  );
  await validator.waitForDeployment();
  const validatorAddress = await validator.getAddress();
  console.log('  ✅ VeritasValidator deployed');
  console.log('     Address:', validatorAddress);
  console.log('     Gas used: ~550,000');

  // ========================================
  // Step 4: Create Sample Rules
  // ========================================
  console.log('\nStep 4: Creating sample rules...');

  // Rule 1: Trading API - POST
  console.log('\n  Creating Rule 1: Trading Orders - POST');
  console.log('    URL: https://api.trading.com/orders');
  console.log('    Method: POST');
  console.log('    Response Codes: [200, 201]');
  
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
  const receipt1 = await tx1.wait();
  console.log('  ✅ Rule 1 created (ID: 1)');
  console.log('     Gas used:', receipt1.gasUsed.toString());

  // Rule 2: Market Data API - GET
  console.log('\n  Creating Rule 2: Market Data - GET');
  console.log('    URL: https://api.market.com/* (wildcard)');
  console.log('    Method: GET');
  console.log('    Response Codes: [200, 299]');
  console.log('    Pattern: "price":"');
  
  const checkData2 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    [
      'https://api.market.com/*',
      'GET',
      200,
      299,
      ethers.toUtf8Bytes('"price":"'),
      true
    ]
  );

  const tx2 = await ruleRegistry.createRule(
    'Market Data - Get',
    'Validate market data retrieval',
    httpCheckAddress,
    checkData2
  );
  const receipt2 = await tx2.wait();
  console.log('  ✅ Rule 2 created (ID: 2)');
  console.log('     Gas used:', receipt2.gasUsed.toString());

  // Rule 3: General API - GET
  console.log('\n  Creating Rule 3: General API - GET');
  console.log('    URL: https://api.example.com/* (wildcard)');
  console.log('    Method: GET');
  console.log('    Response Codes: [200, 299]');
  
  const checkData3 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    [
      'https://api.example.com/*',
      'GET',
      200,
      299,
      '0x',
      false
    ]
  );

  const tx3 = await ruleRegistry.createRule(
    'General API - Get',
    'Validate general GET requests',
    httpCheckAddress,
    checkData3
  );
  const receipt3 = await tx3.wait();
  console.log('  ✅ Rule 3 created (ID: 3)');
  console.log('     Gas used:', receipt3.gasUsed.toString());

  // ========================================
  // Step 5: Print Summary
  // ========================================
  console.log('\n=================================================');
  console.log('  DEPLOYMENT COMPLETE - BASE SEPOLIA');
  console.log('  =================================================\n');

  console.log('Contract Addresses:');
  console.log('  --------------------');
  console.log(`  RuleRegistry:     ${ruleRegistryAddress}`);
  console.log(`  HTTPCheck:        ${httpCheckAddress}`);
  console.log(`  VeritasValidator: ${validatorAddress}`);
  console.log(`  Primus ZKTLS:     ${PRIMUS_ZKTLS_ADDRESS} (Real)`);

  console.log('\n  Rules Created:');
  console.log('  --------------');
  const ruleCount = await ruleRegistry.getRuleCount();
  for (let i = 1; i <= Number(ruleCount); i++) {
    const rule = await ruleRegistry.getRule(i);
    console.log(`  ${i}. ${rule.name}`);
    console.log(`     Description: ${rule.description}`);
    console.log(`     Active: ${rule.active}`);
  }

  // ========================================
  // Step 6: Save Deployment Info
  // ========================================
  const deploymentInfo = {
    network: 'base-sepolia',
    chainId: 84532,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ruleRegistry: ruleRegistryAddress,
      httpCheck: httpCheckAddress,
      veritasValidator: validatorAddress,
      primusZKTLS: PRIMUS_ZKTLS_ADDRESS,
    },
    rules: {
      count: Number(ruleCount),
      details: [
        {
          id: 1,
          name: 'Trading Orders - Create',
          url: 'https://api.trading.com/orders',
          method: 'POST'
        },
        {
          id: 2,
          name: 'Market Data - Get',
          url: 'https://api.market.com/*',
          method: 'GET'
        },
        {
          id: 3,
          name: 'General API - Get',
          url: 'https://api.example.com/*',
          method: 'GET'
        }
      ]
    }
  };

  console.log('\n  Deployment Info (JSON):');
  console.log('  -----------------------');
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // ========================================
  // Step 7: Next Steps
  // ========================================
  console.log('\n  📝 Next Steps:');
  console.log('  ---------------');
  console.log('  1. Update SDK with deployed addresses:');
  console.log(`     VALIDATOR_ADDRESS = '${validatorAddress}'`);
  console.log('');
  console.log('  2. Test attestation generation with Primus SDK');
  console.log('  3. Submit attestation to VeritasValidator');
  console.log('  4. Verify validation results');
  console.log('');
  console.log('  5. Monitor events on Base Sepolia explorer:');
  console.log('     https://sepolia.basescan.org/');

  console.log('\n  ✅ Deployment successful!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('  ❌ Deployment failed:', error);
    process.exit(1);
  });
