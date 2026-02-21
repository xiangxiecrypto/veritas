/**
 * Deploy and Test PrimusVeritasAppV5 with Full Primus SDK Integration
 * 
 * This script:
 * 1. Deploys PrimusVeritasAppV5 with correct callback interface
 * 2. Adds a verification rule (Coinbase BTC price)
 * 3. Calls requestValidation() which submits task to Primus
 * 4. Calls Primus SDK attest() to trigger off-chain zkTLS
 * 5. Monitors for the callback from Primus
 */

const hre = require("hardhat");
const { ethers } = hre;

// Import Primus SDK
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const CHAIN_ID = 84532;
const EXPLORER = 'https://sepolia.basescan.org';

// Existing contracts (Base Sepolia)
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';  // Real Primus TaskContract
const REGISTRY_V4 = '0x257DC4B38066840769EeA370204AD3724ddb0836';  // Existing V4 Registry
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';  // ERC-8004 Identity

// Known Primus attestor on Base Sepolia
const PRIMUS_ATTESTOR = '0x0DE886e31723e64Aa72e51977B14475fB66a9f72';

async function main() {
  const [wallet] = await ethers.getSigners();

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       DEPLOY & TEST PRIMUS VERITAS APP V5                    ║');
  console.log('║       (Full Primus SDK Integration)                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  console.log('Wallet:', wallet.address);
  console.log('Balance:', ethers.utils.formatEther(await wallet.getBalance()), 'ETH\n');

  // ==========================================================================
  // STEP 1: Deploy PrimusVeritasAppV5
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY PRIMUSVERITASAPPV5');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const AppV5Factory = await ethers.getContractFactory("PrimusVeritasAppV5");
  
  console.log('Deploying with:');
  console.log('  Registry:', REGISTRY_V4);
  console.log('  PrimusTask:', PRIMUS_TASK);
  console.log('');

  const appV5 = await AppV5Factory.deploy(REGISTRY_V4, PRIMUS_TASK);
  await appV5.deployed();
  
  console.log('✅ PrimusVeritasAppV5 deployed!');
  console.log('  Address:', appV5.address);
  console.log('  Explorer:', EXPLORER + '/address/' + appV5.address);
  console.log('  Tx:', appV5.deployTransaction.hash);
  console.log('');

  // ==========================================================================
  // STEP 2: Add Verification Rule
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: ADD BTC PRICE VERIFICATION RULE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Coinbase BTC price API template
  const templateId = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
  const dataKey = "btcPrice";  // Must match SDK keyName
  const maxAge = 3600;  // 1 hour
  
  const addRuleTx = await appV5.addRule(
    templateId,
    dataKey,
    2,  // decimals (for cents)
    maxAge,
    "Coinbase BTC Price Verification"
  );
  await addRuleTx.wait();
  
  const ruleId = 0;
  const rule = await appV5.rules(ruleId);
  console.log('✅ Rule added (ID: 0)');
  console.log('  Template:', rule.templateId);
  console.log('  Data Key:', rule.dataKey);
  console.log('  Max Age:', rule.maxAge.toString(), 'seconds');
  console.log('');

  // ==========================================================================
  // STEP 3: Query Primus Fee
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: QUERY PRIMUS FEE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const feeInfo = await appV5.primusTask().then(async taskAddr => {
    const task = await ethers.getContractAt([
      "function queryLatestFeeInfo(uint8 tokenSymbol) view returns (tuple(uint256 primusFee, uint256 attestorFee))"
    ], taskAddr);
    return task.queryLatestFeeInfo(0);  // ETH = 0
  });
  
  console.log('Primus Fee Structure:');
  console.log('  Primus Fee:', ethers.utils.formatEther(feeInfo.primusFee), 'ETH');
  console.log('  Attestor Fee:', ethers.utils.formatEther(feeInfo.attestorFee), 'ETH');
  console.log('  Total (1 attestor):', ethers.utils.formatEther(
    feeInfo.primusFee.add(feeInfo.attestorFee)
  ), 'ETH');
  console.log('');

  // ==========================================================================
  // STEP 4: Request Validation (Submit Task to Primus)
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: REQUEST VALIDATION (SUBMIT TASK)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('This will:');
  console.log('  1. Call appV5.requestValidation()');
  console.log('  2. App submits task to Primus with appV5.address as callback');
  console.log('');
  
  // Use agentId 582 (from previous tests)
  const agentId = 582;
  const attestorCount = 1;
  const totalFee = feeInfo.primusFee.add(feeInfo.attestorFee.mul(attestorCount));
  
  console.log('Requesting validation:');
  console.log('  Agent ID:', agentId);
  console.log('  Rule ID:', ruleId);
  console.log('  Attestor Count:', attestorCount);
  console.log('  Fee:', ethers.utils.formatEther(totalFee), 'ETH');
  console.log('  Callback:', appV5.address);
  console.log('');

  const requestTx = await appV5.requestValidation(
    agentId,
    ruleId,
    [],  // empty = all checks
    attestorCount,
    { value: totalFee }
  );
  
  console.log('✅ Request submitted!');
  console.log('  Tx:', requestTx.hash);
  console.log('  Explorer:', EXPLORER + '/tx/' + requestTx.hash);
  console.log('');
  
  const receipt = await requestTx.wait();
  console.log('✅ Confirmed in block:', receipt.blockNumber);
  console.log('');
  
  // Get taskId from event
  const event = receipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  console.log('Task ID:', taskId);
  console.log('');

  // ==========================================================================
  // STEP 5: Call Primus SDK attest() to Trigger Off-Chain zkTLS
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: CALL PRIMUS SDK ATTEST()');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Initializing Primus Network SDK...');
  console.log('  Chain ID:', CHAIN_ID);
  console.log('  Wallet:', wallet.address);
  console.log('');

  try {
    const primus = new PrimusNetwork();
    await primus.init(wallet, CHAIN_ID);
    console.log('✅ Primus SDK initialized');
    console.log('');

    console.log('Calling primus.attest()...');
    console.log('  Task ID:', taskId);
    console.log('  Task Tx Hash:', requestTx.hash);
    console.log('  Attestor:', PRIMUS_ATTESTOR);
    console.log('  URL:', templateId);
    console.log('  Key Name:', dataKey);
    console.log('  Parse Path: $.data.rates.USD');
    console.log('');

    // Note: SDK expects taskId as hex string without 0x prefix sometimes
    // Try both formats
    let taskIdForSdk = taskId;
    if (taskId.startsWith('0x')) {
      taskIdForSdk = taskId.slice(2);
    }

    const result = await primus.attest({
      taskId: taskIdForSdk,
      taskTxHash: requestTx.hash,
      taskAttestors: [PRIMUS_ATTESTOR],
      requests: [{ 
        url: templateId, 
        method: 'GET' 
      }],
      responseResolves: [[{ 
        keyName: dataKey, 
        parsePath: '$.data.rates.USD' 
      }]]
    }, 60000);  // 60 second timeout

    console.log('✅ Primus attest() completed!');
    console.log('');
    console.log('Attestation Result:');
    console.log('  Result count:', result.length);
    
    if (result.length > 0) {
      const attestation = result[0];
      console.log('  Attestor:', attestation.attestor);
      console.log('  Attestation data:', attestation.attestation?.data?.substring(0, 200));
      console.log('  Timestamp:', attestation.attestation?.timestamp);
    }
    console.log('');

  } catch (e) {
    console.error('❌ Primus SDK error:', e.message);
    console.log('');
    console.log('This may happen if:');
    console.log('  - SDK internal error (check node version compatibility)');
    console.log('  - Network connection issues');
    console.log('  - Invalid task parameters');
    console.log('');
    console.log('The task has been submitted to Primus. You can manually trigger');
    console.log('the attestation using the Primus SDK in a separate script:');
    console.log('');
    console.log('  const primus = new PrimusNetwork();');
    console.log('  await primus.init(wallet, 84532);');
    console.log('  await primus.attest({');
    console.log(`    taskId: '${taskId}',`);
    console.log(`    taskTxHash: '${requestTx.hash}',`);
    console.log(`    taskAttestors: ['${PRIMUS_ATTESTOR}'],`);
    console.log('    requests: [{ url: "' + templateId + '", method: "GET" }],');
    console.log('    responseResolves: [[{ keyName: "' + dataKey + '", parsePath: "$.data.rates.USD" }]]');
    console.log('  }, 60000);');
    console.log('');
  }

  // ==========================================================================
  // STEP 6: Monitor for Callback
  // ==========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 6: MONITOR FOR PRIMUS CALLBACK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('Waiting for Primus callback...');
  console.log('  (This may take 1-2 minutes after attest() completes)');
  console.log('  Querying callbackAttempts every 10 seconds...\n');
  
  const initialCount = await appV5.callbackAttemptCount();
  console.log('Initial callback count:', initialCount.toString());
  
  // Poll for callback
  let attempts = 0;
  const maxAttempts = 30;  // 5 minutes
  let callbackReceived = false;
  
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 10000));  // Wait 10s
    attempts++;
    
    const currentCount = await appV5.callbackAttemptCount();
    if (currentCount.gt(initialCount)) {
      console.log('\n✅ CALLBACK RECEIVED!');
      console.log('  New callback count:', currentCount.toString());
      
      // Get latest callback details
      const latestAttempt = await appV5.getCallbackAttempt(currentCount.sub(1));
      console.log('  Task ID:', latestAttempt.taskId);
      console.log('  Caller:', latestAttempt.caller);
      console.log('  Attestor:', latestAttempt.attestor);
      console.log('  Success:', latestAttempt.success);
      console.log('  Data:', latestAttempt.data?.substring(0, 100) + '...');
      
      // Check if validation completed
      const processed = await appV5.processedTasks(taskId);
      console.log('  Processed:', processed);
      
      if (processed) {
        console.log('\n✅ VALIDATION COMPLETED SUCCESSFULLY!');
      }
      
      callbackReceived = true;
      break;
    }
    
    process.stdout.write('.');
  }
  
  if (!callbackReceived) {
    console.log('\n\n⚠️ No callback received within timeout');
    console.log('  The attestation may still be processing.');
    console.log('  Check status later with: npx hardhat run scripts/check-callback-status.js --network baseSepolia');
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DEPLOYMENT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('PrimusVeritasAppV5:');
  console.log('  Address:', appV5.address);
  console.log('  Explorer:', EXPLORER + '/address/' + appV5.address);
  console.log('  Registry:', REGISTRY_V4);
  console.log('  PrimusTask:', PRIMUS_TASK);
  console.log('');
  console.log('Verification Rule:');
  console.log('  Rule ID: 0');
  console.log('  Template:', templateId);
  console.log('  Data Key:', dataKey);
  console.log('');
  console.log('Task:');
  console.log('  Task ID:', taskId);
  console.log('  Tx:', requestTx.hash);
  console.log('');
  
  if (callbackReceived) {
    console.log('✅ Auto-callback is WORKING!');
    console.log('   Primus automatically called your contract after attestation.');
  } else {
    console.log('⏳ Callback status: PENDING');
    console.log('   Run check-callback-status.js later to verify.');
  }
  console.log('');
}

main().catch(console.error);
