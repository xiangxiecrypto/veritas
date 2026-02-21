/**
 * Corrected PrimusVeritasAppV5 Integration
 * 
 * This uses the OFFICIAL Primus SDK flow from their example:
 * 1. SDK submitTask() → get task details
 * 2. SDK attest() → trigger zkTLS
 * 3. SDK verifyAndPollTaskResult() → wait for completion
 * 4. Contract receives callback automatically
 */

const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const CHAIN_ID = 84532;
const EXPLORER = 'https://sepolia.basescan.org';
const REGISTRY_V4 = '0x257DC4B38066840769EeA370204AD3724ddb0836';

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       CORRECTED PRIMUS SDK INTEGRATION                       ║');
  console.log('║       (Following Official Example Flow)                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const [wallet] = await ethers.getSigners();
  console.log('Wallet:', wallet.address);
  console.log('');

  // ==========================================================================
  // STEP 1: Deploy PrimusVeritasAppV5
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY PRIMUSVERITASAPPV5');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const AppV5 = await ethers.getContractFactory("PrimusVeritasAppV5");
  
  // IMPORTANT: We need the Primus Task contract address
  // This is the official Primus Task contract on Base Sepolia
  const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
  
  const appV5 = await AppV5.deploy(REGISTRY_V4, PRIMUS_TASK);
  await appV5.deployed();
  
  console.log('✅ PrimusVeritasAppV5 deployed:', appV5.address);
  console.log('  Explorer:', EXPLORER + '/address/' + appV5.address);
  console.log('');

  // ==========================================================================
  // STEP 2: Add Verification Rule
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: ADD VERIFICATION RULE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await appV5.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "btcPrice",
    2,
    3600,
    "BTC Price from Coinbase"
  );
  console.log('✅ Rule 0 added');
  console.log('');

  // ==========================================================================
  // STEP 3: Initialize Primus SDK
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: INITIALIZE PRIMUS SDK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  console.log('✅ Primus SDK initialized');
  console.log('');

  // ==========================================================================
  // STEP 4: SDK Submit Task (Official Flow)
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: SDK SUBMIT TASK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // This is the CORRECT way - SDK handles task submission
  const submitTaskParams = {
    address: appV5.address,  // Your contract address as callback
  };
  
  console.log('Calling primus.submitTask()...');
  console.log('  Callback address:', appV5.address);
  console.log('');

  let submitTaskResult;
  try {
    submitTaskResult = await primus.submitTask(submitTaskParams);
    console.log('✅ Submit task result:');
    console.log('  Task ID:', submitTaskResult.taskId);
    console.log('  Task Tx Hash:', submitTaskResult.taskTxHash);
    console.log('  Task Attestors:', submitTaskResult.taskAttestors);
    console.log('');
  } catch (e) {
    console.error('❌ submitTask failed:', e.message);
    return;
  }

  // ==========================================================================
  // STEP 5: SDK Attest (Official Flow)
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: SDK ATTEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Request configuration (from official example)
  const requests = [{
    url: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    method: "GET",
    header: {},
    body: "",
  }];

  // Response resolution (from official example with parseType added)
  const responseResolves = [[{
    keyName: "btcPrice",
    parseType: "json",  // ← This was missing!
    parsePath: "$.data.rates.USD",
  }]];

  // Compose params - THIS IS THE KEY PART
  // Spread submitTaskParams AND submitTaskResult
  const attestParams = {
    ...submitTaskParams,
    ...submitTaskResult,  // ← Contains taskId, taskTxHash, taskAttestors
    requests,
    responseResolves,
  };

  console.log('Calling primus.attest() with params:');
  console.log('  Task ID:', attestParams.taskId);
  console.log('  Task Tx Hash:', attestParams.taskTxHash);
  console.log('  Requests:', JSON.stringify(requests, null, 2));
  console.log('  Response Resolves:', JSON.stringify(responseResolves, null, 2));
  console.log('');

  let attestResult;
  try {
    attestResult = await primus.attest(attestParams);
    console.log('✅ Attest result:');
    console.log('  Result count:', attestResult.length);
    if (attestResult.length > 0) {
      console.log('  [0] Task ID:', attestResult[0].taskId);
      console.log('  [0] Report Tx Hash:', attestResult[0].reportTxHash);
      console.log('  [0] Attestor:', attestResult[0].attestor);
    }
    console.log('');
  } catch (e) {
    console.error('❌ attest failed:', e.message);
    console.log('');
    console.log('This is the SDK bug we encountered earlier.');
    console.log('The official example should work but may have the same issue.');
    return;
  }

  // ==========================================================================
  // STEP 6: Verify and Poll Task Result (Official Flow)
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 6: VERIFY AND POLL TASK RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const verifyParams = {
    taskId: attestResult[0].taskId,
    reportTxHash: attestResult[0].reportTxHash,
  };

  console.log('Calling primus.verifyAndPollTaskResult()...');
  console.log('  Task ID:', verifyParams.taskId);
  console.log('  Report Tx Hash:', verifyParams.reportTxHash);
  console.log('');

  try {
    const taskResult = await primus.verifyAndPollTaskResult(verifyParams);
    console.log('✅ Task result:');
    console.log('  Status:', taskResult.status);
    console.log('  Attestation:', taskResult.attestation);
    console.log('');
  } catch (e) {
    console.error('❌ verifyAndPollTaskResult failed:', e.message);
  }

  // ==========================================================================
  // STEP 7: Check Contract Callback
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 7: CHECK CONTRACT CALLBACK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Checking if callback was received by contract...');
  const callbackCount = await appV5.callbackAttemptCount();
  console.log('Callback attempts:', callbackCount.toString());

  if (callbackCount.gt(0)) {
    const attempt = await appV5.getCallbackAttempt(callbackCount.sub(1));
    console.log('\n✅ Callback received!');
    console.log('  Caller:', attempt.caller);
    console.log('  Task ID:', attempt.taskId);
    console.log('  Success:', attempt.success);
  } else {
    console.log('⏳ No callback yet. May still be processing.');
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Contract deployed:', appV5.address);
  console.log('');
  console.log('Key differences from my previous implementation:');
  console.log('  ✅ Call SDK submitTask() FIRST (not through contract)');
  console.log('  ✅ Spread submitTaskResult into attest params');
  console.log('  ✅ Include parseType: "json" in responseResolves');
  console.log('  ✅ Call verifyAndPollTaskResult() to wait for completion');
  console.log('');
  console.log('The callback to your contract happens automatically');
  console.log('when the attestation is submitted on-chain.');
}

main().catch(console.error);
