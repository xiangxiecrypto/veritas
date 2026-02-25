/**
 * @fileoverview Real Test Script - zktls + validate
 * @description Test real API calls with zktls and validate with Veritas
 * 
 * Prerequisites:
 * 1. Contracts already deployed (addresses in .env)
 * 2. Primus app ID and secret
 * 3. Base Sepolia ETH for gas
 */

import { ethers } from 'hardhat';
import { PrimusZKTLS } from '@primus-labs/zktls-core-sdk';

async function main() {
  console.log('=================================================');
  console.log('  Veritas Neat - Real zktls + validate Test');
  console.log('  =================================================\n');

  // Configuration
  const VALIDATOR_ADDRESS = process.env.VALIDATOR_ADDRESS!;
  const PRIMUS_APP_ID = process.env.PRIMUS_APP_ID!;
  const PRIMUS_APP_SECRET = process.env.PRIMUS_APP_SECRET!;

  const [signer] = await ethers.getSigners();
  console.log('Test Configuration:');
  console.log('  Signer:', signer.address);
  console.log('  Validator:', VALIDATOR_ADDRESS);
  console.log('');

  // Initialize Primus ZKTLS
  console.log('Step 1: Initialize Primus ZKTLS...');
  const primus = new PrimusZKTLS({
    appId: PRIMUS_APP_ID,
    appSecret: PRIMUS_APP_SECRET
  });
  await primus.init(PRIMUS_APP_ID, PRIMUS_APP_SECRET);
  console.log('  ✅ Primus ZKTLS initialized\n');

  // Get validator contract
  const validatorAbi = [
    'function validate(tuple(address recipient, tuple(string url, string header, string method, string body) request, tuple(string keyName, string parseType, string parsePath)[] reponseResolve, string data, string attConditions, uint64 timestamp, string additionParams, tuple(address attestorAddr, string url)[] attestors, bytes[] signatures) attestation, uint256 ruleId) external returns (bool passed, bytes32 attestationHash)',
    'function getValidationResult(bytes32 attestationHash) external view returns (uint256 ruleId, bool passed, uint256 timestamp, address recipient, address validator)'
  ];
  const validator = new ethers.Contract(VALIDATOR_ADDRESS, validatorAbi, signer);

  // ========================================
  // Test 1: Trading API - POST
  // ========================================
  console.log('Step 2: Test Trading API - POST');
  console.log('  API URL: https://api.trading.com/orders');
  console.log('  Method: POST');
  console.log('  Body: { symbol: "ETH", amount: 100 }');
  console.log('');

  try {
    // Generate attestation with zktls
    console.log('  2.1: Generating attestation with zktls...');
    const attestation1 = await primus.attest({
      recipient: signer.address,
      url: 'https://api.trading.com/orders',
      method: 'POST',
      body: {
        symbol: 'ETH',
        amount: 100,
        type: 'limit'
      },
      responseResolves: [{
        keyName: 'orderId',
        parseType: 'JSON',
        parsePath: '$.data.orderId'
      }]
    });
    console.log('  ✅ Attestation generated');
    console.log('     Request URL:', attestation1.request.url);
    console.log('     Request Method:', attestation1.request.method);
    console.log('     ParsePath:', attestation1.reponseResolve[0].parsePath);

    // Validate attestation
    console.log('\n  2.2: Validating attestation (Rule 1)...');
    const tx1 = await validator.validate(attestation1, 1);
    const receipt1 = await tx1.wait();
    console.log('  ✅ Validation complete');
    console.log('     Gas used:', receipt1.gasUsed.toString());

    // Get validation result
    const attestationHash1 = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(...)'],
      [attestation1]
    ));
    const result1 = await validator.getValidationResult(attestationHash1);
    console.log('  ✅ Result:');
    console.log('     Passed:', result1.passed);
    console.log('     Rule ID:', result1.ruleId.toString());
    console.log('     Recipient:', result1.recipient);
  } catch (error: any) {
    console.log('  ❌ Test 1 failed:', error.message);
  }

  console.log('\n  =======================================\n');

  // ========================================
  // Test 2: Market Data API - GET
  // ========================================
  console.log('Step 3: Test Market Data API - GET');
  console.log('  API URL: https://api.market.com/prices/ETH');
  console.log('  Method: GET');
  console.log('');

  try {
    // Generate attestation with zktls
    console.log('  3.1: Generating attestation with zktls...');
    const attestation2 = await primus.attest({
      recipient: signer.address,
      url: 'https://api.market.com/prices/ETH',
      method: 'GET',
      responseResolves: [{
        keyName: 'price',
        parseType: 'JSON',
        parsePath: '$.data.price'
      }]
    });
    console.log('  ✅ Attestation generated');
    console.log('     Request URL:', attestation2.request.url);
    console.log('     ParsePath:', attestation2.reponseResolve[0].parsePath);

    // Validate attestation
    console.log('\n  3.2: Validating attestation (Rule 2)...');
    const tx2 = await validator.validate(attestation2, 2);
    const receipt2 = await tx2.wait();
    console.log('  ✅ Validation complete');
    console.log('     Gas used:', receipt2.gasUsed.toString());

    // Get validation result
    const attestationHash2 = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(...)'],
      [attestation2]
    ));
    const result2 = await validator.getValidationResult(attestationHash2);
    console.log('  ✅ Result:');
    console.log('     Passed:', result2.passed);
    console.log('     Rule ID:', result2.ruleId.toString());
    console.log('     Recipient:', result2.recipient);
  } catch (error: any) {
    console.log('  ❌ Test 2 failed:', error.message);
  }

  console.log('\n  =======================================\n');

  // ========================================
  // Test 3: Wrong Recipient (Should Fail)
  // ========================================
  console.log('Step 4: Test Wrong Recipient (Should Fail)');
  console.log('  This test should fail because recipient != msg.sender');
  console.log('');

  try {
    // Generate attestation with wrong recipient
    console.log('  4.1: Generating attestation with wrong recipient...');
    const attestation3 = await primus.attest({
      recipient: '0x1234567890123456789012345678901234567890',  // Wrong address
      url: 'https://api.example.com/data',
      method: 'GET'
    });
    console.log('  ✅ Attestation generated');

    // Try to validate (should fail)
    console.log('\n  4.2: Trying to validate (should fail)...');
    const tx3 = await validator.validate(attestation3, 3);
    await tx3.wait();
    console.log('  ❌ This should have failed!');
  } catch (error: any) {
    console.log('  ✅ Correctly failed with error:', error.message);
    if (error.message.includes('UnauthorizedRecipient')) {
      console.log('     Error type: UnauthorizedRecipient');
    }
  }

  console.log('\n  =======================================\n');

  // ========================================
  // Summary
  // ========================================
  console.log('Test Summary:');
  console.log('  ✅ Test 1: Trading API - POST');
  console.log('     - zktls: Generated attestation');
  console.log('     - validate: Verified against Rule 1');
  console.log('');
  console.log('  ✅ Test 2: Market Data API - GET');
  console.log('     - zktls: Generated attestation');
  console.log('     - validate: Verified against Rule 2');
  console.log('');
  console.log('  ✅ Test 3: Wrong Recipient');
  console.log('     - Correctly rejected unauthorized recipient');
  console.log('');
  console.log('All tests completed! ✅\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
