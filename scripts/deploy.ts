/**
 * @fileoverview Deployment script for Veritas Protocol
 * @description Deploys verification contracts only - binary validation (no score)
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying Veritas Protocol - Binary Verification...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // 1. Deploy RuleRegistry
  console.log('1. Deploying RuleRegistry...');
  const RuleRegistry = await ethers.getContractFactory('RuleRegistry');
  const ruleRegistry = await RuleRegistry.deploy();
  await ruleRegistry.waitForDeployment();
  const ruleRegistryAddress = await ruleRegistry.getAddress();
  console.log('   RuleRegistry:', ruleRegistryAddress);

  // 2. Deploy HTTPCheck
  console.log('\n2. Deploying HTTPCheck...');
  const HTTPCheck = await ethers.getContractFactory('HTTPCheck');
  const httpCheck = await HTTPCheck.deploy();
  await httpCheck.waitForDeployment();
  const httpCheckAddress = await httpCheck.getAddress();
  console.log('   HTTPCheck:', httpCheckAddress);

  // 3. Deploy VeritasValidator
  console.log('\n3. Deploying VeritasValidator...');
  const VeritasValidator = await ethers.getContractFactory('VeritasValidator');
  const validator = await VeritasValidator.deploy(ruleRegistryAddress);
  await validator.waitForDeployment();
  const validatorAddress = await validator.getAddress();
  console.log('   VeritasValidator:', validatorAddress);

  // 4. Create sample rule (no score requirement)
  console.log('\n4. Creating sample verification rule...');
  const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes'],
    ['https://api.example.com/*', 'POST', 200, 299, '0x']
  );

  const createRuleTx = await ruleRegistry.createRule(
    'Example API Verification',
    'Verify API calls to example.com',
    httpCheckAddress,
    checkData
  );
  await createRuleTx.wait();
  console.log('   Sample rule created (ID: 1)');

  // 5. Print summary
  console.log('\n========================================');
  console.log('Deployment Complete!');
  console.log('========================================\n');

  console.log('Contract Addresses:');
  console.log('-------------------');
  console.log(`RuleRegistry:     ${ruleRegistryAddress}`);
  console.log(`HTTPCheck:        ${httpCheckAddress}`);
  console.log(`VeritasValidator: ${validatorAddress}`);

  console.log('\nSample Rule:');
  console.log('------------');
  console.log('ID:              1');
  console.log('Name:            Example API Verification');
  console.log('Check Contract:  HTTPCheck');
  console.log('Validation:      Binary (passed/failed)');

  // 6. Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    contracts: {
      ruleRegistry: ruleRegistryAddress,
      httpCheck: httpCheckAddress,
      veritasValidator: validatorAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('\nDeployment Info:');
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log('\n📝 Next Steps:');
  console.log('1. Create more rules using RuleRegistry.createRule()');
  console.log('2. Use VeritasSDK to generate proofs');
  console.log('3. Validate proofs using VeritasValidator.validate()');
  console.log('4. Result: passed (true/false) - no score');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
