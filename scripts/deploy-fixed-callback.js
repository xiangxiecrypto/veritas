/**
 * FIXED Primus SDK Integration
 * 
 * The SDK submitTask function has this signature:
 * submitTask(address, templateId, attestorCount, tokenSymbol, callbackAddress)
 * 
 * The callbackAddress is the 5th parameter, not in an object!
 */

const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const CHAIN_ID = 84532;
const EXPLORER = 'https://sepolia.basescan.org';
const REGISTRY_V4 = '0x257DC4B38066840769EeA370204AD3724ddb0836';
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       FIXED PRIMUS SDK INTEGRATION                           ║');
  console.log('║       (Correct submitTask Parameters)                        ║');
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

  const templateId = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
  
  await appV5.addRule(templateId, "btcPrice", 2, 3600, "BTC Price");
  console.log('✅ Rule 0 added');
  console.log('  Template:', templateId);
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
  // STEP 4: SDK Submit Task WITH CALLBACK
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: SDK SUBMIT TASK (WITH CALLBACK)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // CORRECT SDK submitTask call:
  // submitTask(address, templateId, attestorCount, tokenSymbol, callbackAddress)
  //                                                          ↑↑↑↑↑
  //                                                   Callback is 5th param!
  
  console.log('Calling primus.submitTask() with correct parameters:');
  console.log('  1. address (sender):', wallet.address);
  console.log('  2. templateId:', templateId);
  console.log('  3. attestorCount:', 1);
  console.log('  4. tokenSymbol:', 0, '(ETH)');
  console.log('  5. callbackAddress:', appV5.address, '← THIS IS THE KEY!');
  console.log('');

  let submitTaskResult;
  try {
    // CORRECT: Pass callback as 5th parameter
    submitTaskResult = await primus.submitTask(
      wallet.address,     // 1. sender address
      templateId,         // 2. template/URL
      1,                  // 3. attestor count
      0,                  // 4. token symbol (0=ETH)
      appV5.address       // 5. CALLBACK ADDRESS! ← This was missing before!
    );
    
    console.log('✅ Submit task result:');
    console.log('  Task ID:', submitTaskResult.taskId);
    console.log('  Task Tx Hash:', submitTaskResult.taskTxHash);
    console.log('  Task Attestors:', submitTaskResult.taskAttestors);
    console.log('');
  } catch (e) {
    console.error('❌ submitTask failed:', e.message);
    console.log('');
    console.log('Trying alternative SDK call format...');
    
    // Try calling with object format if available
    try {
      submitTaskResult = await primus.submitTask({
        address: wallet.address,
        templateId: templateId,
        attestorCount: 1,
        tokenSymbol: 0,
        callbackAddress: appV5.address  // Try with callbackAddress field
      });
      console.log('✅ Submit task succeeded with object format!');
    } catch (e2) {
      console.error('❌ Both formats failed:', e2.message);
      return;
    }
  }

  // Verify callback is set correctly
  const taskContract = await ethers.getContractAt([
    "function queryTask(bytes32) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], PRIMUS_TASK);
  
  const taskInfo = await taskContract.queryTask(submitTaskResult.taskId);
  console.log('Verifying callback in task:');
  console.log('  Callback:', taskInfo.callback);
  if (taskInfo.callback === appV5.address) {
    console.log('  ✅ Callback correctly set to AppV5!');
  } else if (taskInfo.callback === '0x0000000000000000000000000000000000000000') {
    console.log('  ❌ Callback still 0x0000 - SDK may use different parameter format');
    console.log('  The SDK interface may be different than expected.');
  }
  console.log('');

  // ==========================================================================
  // STEP 5: SDK Attest
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: SDK ATTEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const requests = [{
    url: templateId,
    method: "GET",
    header: {},
    body: "",
  }];

  const responseResolves = [[{
    keyName: "btcPrice",
    parseType: "json",
    parsePath: "$.data.rates.USD",
  }]];

  const attestParams = {
    address: wallet.address,
    taskId: submitTaskResult.taskId,
    taskTxHash: submitTaskResult.taskTxHash,
    taskAttestors: submitTaskResult.taskAttestors,
    requests,
    responseResolves,
  };

  console.log('Calling primus.attest()...');
  console.log('  Task ID:', attestParams.taskId);
  console.log('');

  let attestResult;
  try {
    attestResult = await primus.attest(attestParams);
    console.log('✅ Attest completed!');
    console.log('  Result count:', attestResult.length);
    if (attestResult.length > 0) {
      console.log('  [0] Task ID:', attestResult[0].taskId);
      console.log('  [0] Report Tx Hash:', attestResult[0].reportTxHash);
      console.log('  [0] Attestor:', attestResult[0].attestor);
    }
    console.log('');
  } catch (e) {
    console.error('❌ Attest failed:', e.message);
    return;
  }

  // ==========================================================================
  // STEP 6: Verify and Poll
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 6: VERIFY AND POLL TASK RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const taskResult = await primus.verifyAndPollTaskResult({
      taskId: attestResult[0].taskId,
      reportTxHash: attestResult[0].reportTxHash,
    });
    console.log('✅ Task result:');
    console.log(' ', JSON.stringify(taskResult, null, 2));
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

  const callbackCount = await appV5.callbackAttemptCount();
  console.log('Callback attempts:', callbackCount.toString());

  if (callbackCount.gt(0)) {
    const attempt = await appV5.getCallbackAttempt(callbackCount.sub(1));
    console.log('\n✅ CALLBACK RECEIVED!');
    console.log('  Caller:', attempt.caller);
    console.log('  Task ID:', attempt.taskId);
    console.log('  Success:', attempt.success);
    console.log('  Data:', attempt.data?.substring(0, 200));
    
    const processed = await appV5.processedTasks(submitTaskResult.taskId);
    console.log('\nTask processed:', processed);
  } else {
    console.log('⏳ No callback yet.');
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Contract:', appV5.address);
  console.log('Task ID:', submitTaskResult.taskId);
  console.log('');
  console.log('Key fix:');
  console.log('  SDK submitTask(address, templateId, attestorCount, tokenSymbol, callbackAddress)');
  console.log('  The callbackAddress is the 5th parameter!');
  console.log('');
  if (callbackCount.gt(0)) {
    console.log('✅ SUCCESS! Auto-callback is working!');
  } else {
    console.log('⏳ Callback status pending. Check again later.');
  }
}

main().catch(console.error);
