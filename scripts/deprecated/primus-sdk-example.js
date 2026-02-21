/**
 * Primus Network-Core-SDK Integration Example
 * 
 * Based on: https://github.com/primus-labs/zktls-demo/blob/main/network-core-sdk-example/index.js
 * 
 * This demonstrates the correct flow for using Primus SDK with our Veritas contracts
 */

const { PrimusNetwork } = require("@primuslabs/network-core-sdk");
const { ethers } = require("ethers");

// Our deployed V4 contracts
const APP_ADDRESS = "0x8C2185d3C7D4458Eb379E67eaBff056A8D4E1aeB";
const REGISTRY_ADDRESS = "0x257DC4B38066840769EeA370204AD3724ddb0836";

// Configuration
const CHAIN_ID = 84532; // Base Sepolia
const RPC_URL = "https://sepolia.base.org";

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("ERROR: PRIVATE_KEY not set");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("Primus Network-Core-SDK Integration Example");
  console.log("=".repeat(60));
  console.log("");

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(pk, provider);

  console.log("Wallet:", wallet.address);
  console.log("Chain ID:", CHAIN_ID);
  console.log("App Address:", APP_ADDRESS);
  console.log("");

  // ============================================
  // STEP 1: Initialize Primus SDK
  // ============================================
  console.log("STEP 1: Initialize Primus SDK");
  console.log("-".repeat(40));

  const primusNetwork = new PrimusNetwork();
  const initResult = await primusNetwork.init(wallet, CHAIN_ID);
  console.log("✓ SDK initialized");
  console.log("");

  // ============================================
  // STEP 2: Define Requests (HTTP calls)
  // ============================================
  console.log("STEP 2: Define Requests");
  console.log("-".repeat(40));

  // Example 1: BTC price from OKX
  const btcRequest = {
    url: "https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=BTC-USD",
    method: "GET",
    header: {},
    body: "",
  };

  // Example 2: ETH price from OKX
  const ethRequest = {
    url: "https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=ETH-USD",
    method: "GET",
    header: {},
    body: "",
  };

  console.log("✓ BTC Request:", btcRequest.url);
  console.log("✓ ETH Request:", ethRequest.url);
  console.log("");

  // ============================================
  // STEP 3: Define Response Resolves (JSONPath + Operations)
  // ============================================
  console.log("STEP 3: Define Response Resolves");
  console.log("-".repeat(40));

  // This is where the magic happens!
  // JSONPath parsing and operations happen in the SDK, not in Solidity

  // Example 1: Extract BTC price with range check
  // $.data[0].last = "67000.5" -> extract value and check range
  const btcResponseResolves = [
    [
      {
        keyName: "btcPrice",
        parseType: "json",
        parsePath: "$.data[0].last",
        // No operation here - just extract the value
        // Operations can be added for basic validation during attestation:
        // op: "<",
        // value: 100000,  // Price must be less than $100,000
      },
    ],
  ];

  // Example 2: Extract ETH price with threshold check
  const ethResponseResolves = [
    [
      {
        keyName: "ethPrice",
        parseType: "json",
        parsePath: "$.data[0].last",
        op: "<",
        value: 5000, // Price must be less than $5,000
      },
    ],
  ];

  console.log("✓ BTC Response Resolve:");
  console.log("  - keyName: btcPrice");
  console.log("  - parsePath: $.data[0].last");
  console.log("");
  console.log("✓ ETH Response Resolve:");
  console.log("  - keyName: ethPrice");
  console.log("  - parsePath: $.data[0].last");
  console.log("  - op: < 5000");
  console.log("");

  // ============================================
  // STEP 4: Submit Task
  // ============================================
  console.log("STEP 4: Submit Task");
  console.log("-".repeat(40));

  const submitTaskParams = {
    address: APP_ADDRESS,
  };

  const submitTaskResult = await primusNetwork.submitTask(submitTaskParams);
  console.log("✓ Task submitted:", submitTaskResult);
  console.log("");

  // ============================================
  // STEP 5: Create Attestation
  // ============================================
  console.log("STEP 5: Create Attestation");
  console.log("-".repeat(40));

  const attestParams = {
    ...submitTaskParams,
    ...submitTaskResult,
    requests: [btcRequest],
    responseResolves: btcResponseResolves,
    // Optional: Get all JSON response
    // getAllJsonResponse: "true",
  };

  console.log("Creating attestation for BTC price...");
  const attestResult = await primusNetwork.attest(attestParams);
  console.log("✓ Attestation created:");
  console.log("  Task ID:", attestResult[0]?.taskId);
  console.log("  Report Tx Hash:", attestResult[0]?.reportTxHash);
  console.log("");

  // ============================================
  // STEP 6: Verify and Poll Task Result
  // ============================================
  console.log("STEP 6: Verify and Poll Task Result");
  console.log("-".repeat(40));

  const verifyParams = {
    taskId: attestResult[0].taskId,
    reportTxHash: attestResult[0].reportTxHash,
  };

  const taskResult = await primusNetwork.verifyAndPollTaskResult(verifyParams);
  console.log("✓ Task Result:");
  console.log(JSON.stringify(taskResult, null, 2));
  console.log("");

  // ============================================
  // KEY INSIGHTS
  // ============================================
  console.log("=".repeat(60));
  console.log("KEY INSIGHTS FROM SDK EXAMPLE");
  console.log("=".repeat(60));
  console.log("");
  console.log("1. JSONPath parsing ($.data[0].last) happens in SDK, NOT in Solidity");
  console.log("");
  console.log("2. Operations (<, STREQ, etc.) are done during attestation");
  console.log("");
  console.log("3. Attestation contains EXTRACTED values, not raw JSON");
  console.log("");
  console.log("4. Check contracts should receive PRE-EXTRACTED values");
  console.log("");
  console.log("5. Our current PriceRangeCheck/ThresholdCheck contracts");
  console.log("   should NOT do JSON parsing - they should receive values directly");
  console.log("");
  console.log("6. To fix: Update check contracts to receive values, not JSON");
  console.log("");
}

main().catch(console.error);
