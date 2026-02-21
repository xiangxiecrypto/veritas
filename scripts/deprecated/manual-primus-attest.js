/**
 * Manual Primus SDK Attestation
 * 
 * Run this after deploy-and-test-v5.js if the SDK fails during deployment.
 * This script calls primus.attest() to trigger the off-chain zkTLS.
 */

const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

// Fill in these values from the deployment output
const TASK_ID = process.env.TASK_ID || '0x8a6700cda534a6860a6d4de4253c68a2a4dc9d8e406640d1c49e1a746356afc1';
const TASK_TX_HASH = process.env.TASK_TX_HASH || '0x2efde7548274d2b986e5f70f97661404bfc9ee700f03d51ee21d00b89a286527';
const APP_V5 = process.env.APP_V5 || '0xB9d6453Ee3660e43eeCf541C7D355517687aEFB6';

const PRIMUS_ATTESTOR = '0x0DE886e31723e64Aa72e51977B14475fB66a9f72';
const TEMPLATE_ID = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
const DATA_KEY = "btcPrice";
const CHAIN_ID = 84532;

async function main() {
  const [wallet] = await ethers.getSigners();

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       MANUAL PRIMUS SDK ATTESTATION                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  console.log('Wallet:', wallet.address);
  console.log('Task ID:', TASK_ID);
  console.log('App V5:', APP_V5);
  console.log('');

  // Initialize Primus SDK
  console.log('Initializing Primus Network SDK...');
  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  console.log('✅ Primus SDK initialized');
  console.log('');

  // Prepare taskId (remove 0x if present for SDK)
  let taskIdForSdk = TASK_ID;
  if (taskIdForSdk.startsWith('0x')) {
    taskIdForSdk = taskIdForSdk.slice(2);
  }

  console.log('Calling primus.attest()...');
  console.log('  Task ID:', taskIdForSdk);
  console.log('  Task Tx Hash:', TASK_TX_HASH);
  console.log('  Attestor:', PRIMUS_ATTESTOR);
  console.log('');

  try {
    const result = await primus.attest({
      taskId: taskIdForSdk,
      taskTxHash: TASK_TX_HASH,
      taskAttestors: [PRIMUS_ATTESTOR],
      requests: [{ 
        url: TEMPLATE_ID, 
        method: 'GET' 
      }],
      responseResolves: [[{ 
        keyName: DATA_KEY, 
        parsePath: '$.data.rates.USD' 
      }]]
    }, 120000);  // 120 second timeout

    console.log('');
    console.log('✅ Primus attest() completed!');
    console.log('');
    console.log('Attestation Result:');
    console.log('  Result count:', result.length);
    
    if (result.length > 0) {
      const attestation = result[0];
      console.log('  Attestor:', attestation.attestor);
      console.log('  Task ID:', attestation.taskId);
      console.log('  Data:', attestation.attestation?.data);
      console.log('  Timestamp:', attestation.attestation?.timestamp);
      
      // Now submit the attestation to the contract
      console.log('');
      console.log('Submitting attestation to Veritas contract...');
      
      const appV5 = await ethers.getContractAt("PrimusVeritasAppV5", APP_V5);
      
      // The attestation should have triggered the callback automatically
      // But if not, we can check the status
      const callbackCount = await appV5.callbackAttemptCount();
      console.log('Callback attempts:', callbackCount.toString());
      
      const processed = await appV5.processedTasks('0x' + taskIdForSdk);
      console.log('Task processed:', processed);
      
      if (callbackCount.gt(0)) {
        const latestAttempt = await appV5.getCallbackAttempt(callbackCount.sub(1));
        console.log('Latest callback:');
        console.log('  Caller:', latestAttempt.caller);
        console.log('  Attestor:', latestAttempt.attestor);
        console.log('  Success:', latestAttempt.success);
      }
    }

  } catch (e) {
    console.error('');
    console.error('❌ Primus SDK error:', e.message);
    console.error(e);
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Check NODE_VERSION - SDK may require specific Node version');
    console.log('  2. Try reinstalling SDK: npm reinstall @primuslabs/network-core-sdk');
    console.log('  3. Check Primus documentation for latest SDK usage');
    console.log('');
  }
}

main().catch(console.error);
