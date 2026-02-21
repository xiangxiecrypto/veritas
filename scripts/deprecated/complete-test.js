/**
 * COMPLETE TEST: Full Primus Auto-Callback Flow
 * 
 * This test proves the complete working solution:
 * 1. Deploy PrimusVeritasAppV5
 * 2. SDK submitTask with ALL parameters (including empty templateId)
 * 3. SDK attest with URL in requests
 * 4. Wait for and verify auto-callback
 * 5. Verify contract processed the attestation
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
  console.log('║       COMPLETE TEST: FULL AUTO-CALLBACK FLOW                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const [wallet] = await ethers.getSigners();
  console.log('Wallet:', wallet.address);
  console.log('Balance:', ethers.utils.formatEther(await wallet.getBalance()), 'ETH\n');

  // ==========================================================================
  // STEP 1: Deploy Contracts
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY CONTRACTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const AppV5 = await ethers.getContractFactory("PrimusVeritasAppV5");
  const appV5 = await AppV5.deploy(REGISTRY_V4, PRIMUS_TASK);
  await appV5.deployed();
  console.log('✅ PrimusVeritasAppV5 deployed:', appV5.address);
  console.log('   Explorer:', EXPLORER + '/address/' + appV5.address);

  const PriceRangeCheck = await ethers.getContractFactory("PriceRangeCheckV2");
  const priceCheck = await PriceRangeCheck.deploy();
  await priceCheck.deployed();
  console.log('✅ PriceRangeCheckV2 deployed:', priceCheck.address);

  // Add verification rule
  const templateId = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
  await appV5.addRule(templateId, "btcPrice", 2, 3600, "Coinbase BTC Price");
  
  // Add price range check ($60k-$100k)
  const checkParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]  // cents
  );
  await appV5.addCheck(0, priceCheck.address, checkParams, 100);
  console.log('✅ Rule 0: BTC Price Check ($60k-$100k)\n');

  // ==========================================================================
  // STEP 2: Initialize SDK and Submit Task
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: SDK SUBMIT TASK (ALL PARAMETERS)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  console.log('✅ Primus SDK initialized');
  console.log('');

  console.log('Calling submitTask with ALL parameters:');
  console.log('  address:', appV5.address);
  console.log('  templateId: "" (empty)');
  console.log('  attestorCount: 1');
  console.log('  tokenSymbol: 0 (ETH)');
  console.log('  callbackAddress:', appV5.address);
  console.log('');

  // KEY: Pass ALL parameters including empty templateId
  const submitResult = await primus.submitTask({
    address: appV5.address,
    templateId: "",  // ← KEY: Empty string!
    attestorCount: 1,
    tokenSymbol: 0,
    callbackAddress: appV5.address
  });

  console.log('✅ Task submitted!');
  console.log('  Task ID:', submitResult.taskId);
  console.log('  Task Tx Hash:', submitResult.taskTxHash);
  console.log('  Attestors:', submitResult.taskAttestors);
  console.log('');

  // Verify callback is set correctly
  const taskContract = await ethers.getContractAt([
    "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
  ], PRIMUS_TASK);
  
  const taskInfo = await taskContract.tasks(submitResult.taskId);
  console.log('Task info from contract:');
  console.log('  Requester:', taskInfo.requester);
  console.log('  Callback:', taskInfo.callback);
  console.log('  Status:', taskInfo.status);
  
  if (taskInfo.callback === appV5.address) {
    console.log('  ✅ Callback correctly set to AppV5!\n');
  } else {
    console.log('  ❌ Callback not set correctly\n');
    return;
  }

  // ==========================================================================
  // STEP 3: SDK Attest
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: SDK ATTEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const requests = [{
    url: templateId,
    method: "GET",
    header: {},
    body: ""
  }];

  const responseResolves = [[{
    keyName: "btcPrice",
    parseType: "json",
    parsePath: "$.data.rates.USD"
  }]];

  console.log('Calling attest()...');
  console.log('  Task ID:', submitResult.taskId);
  console.log('  URL:', templateId);
  console.log('');

  const attestResult = await primus.attest({
    address: appV5.address,
    taskId: submitResult.taskId,
    taskTxHash: submitResult.taskTxHash,
    taskAttestors: submitResult.taskAttestors,
    requests,
    responseResolves
  });

  console.log('✅ Attest completed!');
  console.log('  Attestor:', attestResult[0].attestor);
  console.log('  Report Tx:', attestResult[0].reportTxHash);
  console.log('');

  // ==========================================================================
  // STEP 4: Poll for Result
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: POLL FOR ATTESTATION RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Waiting for attestation to complete...');
  const taskResult = await primus.verifyAndPollTaskResult({
    taskId: attestResult[0].taskId,
    reportTxHash: attestResult[0].reportTxHash
  });

  const attestation = taskResult[0].attestation;
  const btcPrice = JSON.parse(attestation.data).btcPrice;
  const timestamp = Math.floor(attestation.timestamp / 1000);  // ms to seconds

  console.log('✅ Attestation received!');
  console.log('  BTC Price: $', btcPrice);
  console.log('  Timestamp:', timestamp, '(', new Date(timestamp * 1000).toISOString(), ')');
  console.log('');

  // ==========================================================================
  // STEP 5: Monitor for Auto-Callback
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: MONITOR FOR AUTO-CALLBACK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Waiting for Primus to auto-call your contract...');
  console.log('  (Primus Task contract should call reportTaskResultCallback on AppV5)');
  console.log('');

  let callbackReceived = false;
  const maxAttempts = 30;
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));  // Wait 5s
    
    const callbackCount = await appV5.callbackAttemptCount();
    process.stdout.write('.');
    
    if (callbackCount.gt(0)) {
      console.log('\n');
      console.log('✅ CALLBACK RECEIVED!');
      
      const attempt = await appV5.getCallbackAttempt(0);
      console.log('  Caller:', attempt.caller);
      console.log('  Task ID:', attempt.taskId);
      console.log('  Attestor:', attempt.attestor);
      console.log('  Success:', attempt.success);
      console.log('  Data:', attempt.data.substring(0, 100) + '...');
      
      callbackReceived = true;
      break;
    }
  }

  if (!callbackReceived) {
    console.log('\n\n⚠️ No callback received after', maxAttempts * 5, 'seconds');
    console.log('Checking task status...');
    const finalTask = await taskContract.tasks(submitResult.taskId);
    console.log('  Status:', finalTask.status, '(1=completed)');
    console.log('  Callback:', finalTask.callback);
  }

  // ==========================================================================
  // STEP 6: Verify Processing
  // ==========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 6: VERIFY CONTRACT PROCESSING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const processed = await appV5.processedTasks(submitResult.taskId);
  console.log('Task processed:', processed);

  if (processed) {
    console.log('  ✅ Contract processed the attestation!');
    
    // Check for events
    const filter = appV5.filters.ValidationCompleted(submitResult.taskId);
    const events = await appV5.queryFilter(filter);
    
    if (events.length > 0) {
      console.log('  ✅ ValidationCompleted event found!');
      console.log('     Score:', events[0].args.score.toString(), '/ 100');
      
      // Verify price was in range
      const priceValue = parseInt(btcPrice.replace('.', ''));
      if (priceValue >= 6000000 && priceValue <= 10000000) {
        console.log('     ✅ Price $', btcPrice, 'is within $60k-$100k range');
      }
    }
  } else {
    console.log('  ⚠️ Task not processed yet (may need more time)');
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 COMPLETE TEST RESULTS 🎉');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Contracts Deployed:');
  console.log('  PrimusVeritasAppV5:', appV5.address);
  console.log('  PriceRangeCheck:', priceCheck.address);
  console.log('');
  console.log('Task:');
  console.log('  Task ID:', submitResult.taskId);
  console.log('  BTC Price: $', btcPrice);
  console.log('');
  console.log('Flow:');
  console.log('  1. ✅ SDK submitTask() with ALL params');
  console.log('  2. ✅ SDK attest() - zkTLS proof generated');
  console.log('  3. ✅ Attestation data received from Primus');
  console.log('  4.', callbackReceived ? '✅ Auto-callback received!' : '⏳ Callback pending...');
  console.log('  5.', processed ? '✅ Contract processed attestation!' : '⏳ Processing pending...');
  console.log('');
  
  if (callbackReceived && processed) {
    console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║              🎉🎉🎉 FULL SUCCESS! 🎉🎉🎉                      ║');
    console.log('║          Auto-callback is WORKING correctly!                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  }
  console.log('');
}

main().catch(console.error);
