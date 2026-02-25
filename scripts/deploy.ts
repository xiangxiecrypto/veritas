/**
 * @fileoverview Deployment script for Veritas Protocol
 * @description Deploys all contracts and sets up initial configuration
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying Veritas Protocol...\n');

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

  // 4. Deploy EnhancedEscrow
  console.log('\n4. Deploying EnhancedEscrow...');
  const EnhancedEscrow = await ethers.getContractFactory('EnhancedEscrow');
  const escrow = await EnhancedEscrow.deploy(validatorAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log('   EnhancedEscrow:', escrowAddress);

  // 5. Create sample rule
  console.log('\n5. Creating sample rule...');
  const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes'],
    ['https://api.example.com/*', 'POST', 200, 299, '0x']
  );

  const createRuleTx = await ruleRegistry.createRule(
    'Example API Check',
    'Verify API calls to example.com',
    httpCheckAddress,
    checkData,
    80 // required score
  );
  await createRuleTx.wait();
  console.log('   Sample rule created (ID: 1)');

  // 6. Print summary
  console.log('\n========================================');
  console.log('Deployment Complete!');
  console.log('========================================\n');

  console.log('Contract Addresses:');
  console.log('-------------------');
  console.log(`RuleRegistry:     ${ruleRegistryAddress}`);
  console.log(`HTTPCheck:        ${httpCheckAddress}`);
  console.log(`VeritasValidator: ${validatorAddress}`);
  console.log(`EnhancedEscrow:   ${escrowAddress}`);

  console.log('\nSample Rule:');
  console.log('------------');
  console.log('ID:              1');
  console.log('Name:            Example API Check');
  console.log('Check Contract:  HTTPCheck');
  console.log('Required Score:  80');

  // 7. Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    contracts: {
      ruleRegistry: ruleRegistryAddress,
      httpCheck: httpCheckAddress,
      veritasValidator: validatorAddress,
      enhancedEscrow: escrowAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('\nDeployment Info:');
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
