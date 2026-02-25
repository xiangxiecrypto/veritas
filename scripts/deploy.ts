/**
 * @fileoverview Deployment script for Veritas Protocol
 * @description Deploys verification contracts with Primus integration
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying Veritas Protocol with Primus Integration...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Primus contract addresses (update based on network)
  const PRIMUS_ADDRESSES = {
    // Base Sepolia
    baseSepolia: '0xC02234058caEaA9416506eABf6Ef3122fCA939E8',
    // Base Mainnet
    base: '0x...',  // Update with actual address
    // Ethereum Mainnet
    ethereum: '0x...',  // Update with actual address
  };

  const network = (await ethers.provider.getNetwork()).name;
  const primusAddress = PRIMUS_ADDRESSES[network as keyof typeof PRIMUS_ADDRESSES] || ethers.ZeroAddress;

  if (primusAddress === ethers.ZeroAddress) {
    console.warn('⚠️  Warning: Primus address not configured for this network');
    console.warn('   Please update PRIMUS_ADDRESSES in the deployment script\n');
  }

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

  // 3. Deploy VeritasValidator with Primus address
  console.log('\n3. Deploying VeritasValidator...');
  const VeritasValidator = await ethers.getContractFactory('VeritasValidator');
  const validator = await VeritasValidator.deploy(
    ruleRegistryAddress,
    primusAddress
  );
  await validator.waitForDeployment();
  const validatorAddress = await validator.getAddress();
  console.log('   VeritasValidator:', validatorAddress);
  console.log('   Primus Address:', primusAddress);

  // 4. Create sample rule
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
  console.log(`Primus ZKTLS:     ${primusAddress}`);

  console.log('\nVerification Flow:');
  console.log('------------------');
  console.log('1. Generate attestation with Primus zktls-core-sdk');
  console.log('2. Submit attestation to VeritasValidator.validate()');
  console.log('3. VeritasValidator calls Primus.verifyAttestation()');
  console.log('4. VeritasValidator executes custom Check logic');
  console.log('5. Returns passed (true/false)');

  // 6. Save deployment info
  const deploymentInfo = {
    network: network,
    deployer: deployer.address,
    contracts: {
      ruleRegistry: ruleRegistryAddress,
      httpCheck: httpCheckAddress,
      veritasValidator: validatorAddress,
      primusZKTLS: primusAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('\nDeployment Info:');
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log('\n📝 Next Steps:');
  console.log('1. Create more rules using RuleRegistry.createRule()');
  console.log('2. Use Primus zktls-core-sdk to generate attestations');
  console.log('3. Validate attestations using VeritasValidator.validate()');
  console.log('4. Result: passed (true/false) - binary validation');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
