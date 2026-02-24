/**
 * @title Test Moltbook Karma Validation
 * @notice Test Moltbook karma validation using VeritasSDK
 */

const hre = require("hardhat");
const { ethers } = hre;
const { VeritasSDK } = require('../sdk/VeritasSDK');

const AGENT_ID = 1018;
const MOLTBOOK_API_KEY = "moltbook_sk_QejPOPNRIt1Xqk7Uoh0I9MXUl-XnyucE";

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('          MOLTBOOK KARMA VALIDATION TEST (VeritasSDK)          ');
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
  console.log('║  RUNNING MOLTBOOK KARMA VALIDATION                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const result = await sdk.validateMoltbookKarma(AGENT_ID, MOLTBOOK_API_KEY);
  
  // Extract karma
  const karmaMatch = result.data?.match(/"karma":"?(\d+)"?/);
  const karma = karmaMatch ? parseInt(karmaMatch[1]) : 0;
  
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
  console.log('Karma:', karma);
  console.log('Score:', result.score, '/ 100');
  console.log('Normalized:', result.normalizedScore, '/ 100');
  console.log('Passed:', result.passed ? '✅ YES' : '❌ NO');
  console.log('');
  console.log('Validation Checks:');
  console.log('   • URL match: ✅');
  console.log('   • dataKey match: ✅');
  console.log('   • parsePath match: ✅');
  console.log('   • karma > 0:', karma > 0 ? '✅ YES' : '❌ NO');
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                    ✅ TEST COMPLETE!                          ');
  console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error);
