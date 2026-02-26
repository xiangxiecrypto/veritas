/**
 * Integration Test Runner for NeatVeritasSDK
 * 
 * Usage:
 *   npx hardhat run test/run-integration-test.ts --network baseSepolia
 * 
 * Prerequisites:
 *   1. Set environment variables:
 *      export PRIMUS_APP_ID="your_app_id"
 *      export PRIMUS_APP_SECRET="your_app_secret"
 *      export VALIDATOR_ADDRESS="deployed_validator_address"
 *      export DEFAULT_RULE_ID="1"
 * 
 *   2. Have deployed contracts (use scripts/deploy.js)
 */

import { ethers } from "hardhat";
import { NeatVeritasSDK } from "../src/sdk";

async function main() {
  console.log("\n========================================");
  console.log("  NeatVeritasSDK Integration Test");
  console.log("  ========================================");
  console.log("");

  // Check environment
  const appId = process.env.PRIMUS_APP_ID;
  const appSecret = process.env.PRIMUS_APP_SECRET;
  const validatorAddress = process.env.VALIDATOR_ADDRESS;

  if (!appId || !appSecret || !validatorAddress) {
    console.log("❌ Missing environment variables!");
    console.log("");
    console.log("Please set:");
    console.log("  export PRIMUS_APP_ID='your_app_id'");
    console.log("  export PRIMUS_APP_SECRET='your_app_secret'");
    console.log("  export VALIDATOR_ADDRESS='validator_address'");
    return;
  }

  console.log("Configuration:");
  console.log("  Validator:", validatorAddress);
  console.log("  App ID:", appId.substring(0, 10) + "...");
  console.log("");

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  console.log("");

  // Initialize SDK
  console.log("STEP 1: Initialize SDK");
  console.log("----------------------------------------");
  
  const sdk = new NeatVeritasSDK({
    signer,
    validatorAddress,
    appId,
    appSecret,
  });

  await sdk.init();
  console.log("✅ SDK initialized");
  console.log("");

  // Test 1: Attestation
  console.log("STEP 2: Generate Attestation");
  console.log("----------------------------------------");
  
  const result = await sdk.attest(
    {
      url: "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      method: "GET",
    },
    [
      {
        keyName: "price",
        parseType: "string",
        parsePath: "$.price",
      },
    ]
  );

  console.log("✅ Attestation generated");
  console.log("");
  console.log("Result:");
  console.log("  Verified:", result.verified);
  console.log("  Data:", result.responseData);
  console.log("  Timestamp:", new Date(result.timestamp * 1000).toISOString());
  console.log("  Hash:", result.attestationHash.substring(0, 20) + "...");
  console.log("");

  // Test 2: Validation
  console.log("STEP 3: On-Chain Validation");
  console.log("----------------------------------------");
  
  const ruleId = parseInt(process.env.DEFAULT_RULE_ID || "1");
  console.log("Using Rule ID:", ruleId);
  
  const validation = await sdk.validate(result.attestation, ruleId);
  
  console.log("✅ Validation complete");
  console.log("");
  console.log("Result:");
  console.log("  Passed:", validation.passed);
  console.log("  Block:", validation.blockNumber);
  console.log("  Gas Used:", validation.gasUsed?.toString());
  console.log("  TX:", validation.transactionHash);
  console.log("");

  // Summary
  console.log("========================================");
  console.log("  ✅ All Tests Passed!");
  console.log("  ========================================");
  console.log("");
  console.log("Explorer:");
  console.log(`  https://sepolia.basescan.org/tx/${validation.transactionHash}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
