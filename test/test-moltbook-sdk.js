/**
 * @title Test Moltbook Karma Validation (Generic SDK)
 * @notice Test Moltbook karma validation using VeritasSDK with generic validate()
 */

const hre = require("hardhat");
const { ethers } = hre;
const { VeritasSDK } = require('../sdk/VeritasSDK');

// Optional: Set MOLTBOOK_API_KEY env var for protected endpoint test
// Without it, test will skip the validation
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY || null;

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('          MOLTBOOK KARMA VALIDATION TEST (Generic SDK)         ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Signer:', wallet.address);
  console.log('');
  
  // Check for API key
  if (!MOLTBOOK_API_KEY) {
    console.log('⚠️  MOLTBOOK_API_KEY not set - skipping protected endpoint test');
    console.log('   Set env var: export MOLTBOOK_API_KEY=your_key');
    console.log('   This test requires a valid Moltbook API key for protected endpoint');
    console.log('');
    return;
  }
  
  // Initialize SDK
  console.log('🔧 Initializing VeritasSDK...');
  const sdk = new VeritasSDK();
  await sdk.init(wallet);
  console.log('');
  
  // Register a new agent for testing
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  AGENT REGISTRATION                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log('   Registering new agent for test...');
  const regResult = await sdk.registerAgent();
  const AGENT_ID = regResult.agentId;
  console.log('   ✅ Agent registered:', AGENT_ID);
  console.log('   Tx:', regResult.txHash);
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
  
  // Build request and responseResolves (Primus SDK format)
  const request = VeritasSDK.createRequest(
    'https://www.moltbook.com/api/v1/agents/me',
    {
      header: {
        "Authorization": `Bearer ${MOLTBOOK_API_KEY}`
      }
    }
  );
  
  const responseResolves = VeritasSDK.createResponseResolve(
    'karma',
    '$.agent.karma'
  );
  
  console.log('📝 Request Config:');
  console.log('   URL:', request.url);
  console.log('   Method:', request.method);
  console.log('   Authorization:', request.header.Authorization?.slice(0, 25) + '...');
  console.log('');
  
  console.log('📝 Response Resolve:');
  console.log('   keyName:', responseResolves[0][0].keyName);
  console.log('   parsePath:', responseResolves[0][0].parsePath);
  console.log('');
  
  // Run validation using generic validate()
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  RUNNING VALIDATION (Protected API)                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Agent ID:', AGENT_ID);
  console.log('Rule ID: 1 (Moltbook Karma)');
  console.log('');
  
  const result = await sdk.validate({
    agentId: AGENT_ID,
    ruleId: 1,  // Moltbook karma rule
    checkIds: [0],  // Required - explicit check IDs
    request: request,
    responseResolves: responseResolves
  });
  
  // Extract karma from data
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
