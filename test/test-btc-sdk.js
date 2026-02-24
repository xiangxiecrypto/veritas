/**
 * @title Test BTC Price Validation
 * @notice Test BTC price validation using VeritasSDK
 */

const hre = require("hardhat");
const { ethers } = hre;
const { VeritasSDK } = require('../sdk/VeritasSDK');

const AGENT_ID = 1018;

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('           BTC PRICE VALIDATION TEST (VeritasSDK)             ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Agent ID:', AGENT_ID);
  console.log('Signer:', wallet.address);
  console.log('');
  
  // Initialize SDK
  console.log('🔧 Initializing VeritasSDK...');
  const sdk = new VeritasSDK();
  await sdk.init(wallet);
  console.log('   ✅ SDK initialized');
  console.log('');
  
  // Check agent registration
  console.log('📋 Checking agent registration...');
  const agentInfo = await sdk.getAgentInfo(AGENT_ID);
  
  if (agentInfo.registered) {
    console.log('   ✅ Agent already registered');
    console.log('   Owner:', agentInfo.owner);
    console.log('   Validations:', agentInfo.validationCount);
  } else {
    console.log('   ⚠️ Agent not registered, registering...');
    const regResult = await sdk.registerAgent(AGENT_ID);
    console.log('   ✅ Agent registered:', regResult.txHash);
  }
  console.log('');
  
  // Get rules
  console.log('📋 Fetching rules...');
  const rules = await sdk.getAllRules();
  console.log('   Total rules:', rules.length);
  
  for (const rule of rules) {
    console.log(`   Rule ${rule.ruleId}: ${rule.description}`);
    console.log(`      URL: ${rule.url}`);
    console.log(`      dataKey: ${rule.dataKey}`);
  }
  console.log('');
  
  // Run validation
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  RUNNING BTC PRICE VALIDATION                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const result = await sdk.validateBTCPrice(AGENT_ID);
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  RESULT                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Success:', result.success ? '✅ YES' : '❌ NO');
  console.log('Task ID:', result.taskId);
  console.log('Request Tx:', result.requestTxHash);
  console.log('Callback Tx:', result.callbackTxHash);
  console.log('Data:', result.data);
  console.log('Score:', result.score, '/ 100');
  console.log('Normalized:', result.normalizedScore, '/ 100');
  console.log('Passed:', result.passed ? '✅ YES' : '❌ NO');
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                    ✅ TEST COMPLETE!                          ');
  console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error);
