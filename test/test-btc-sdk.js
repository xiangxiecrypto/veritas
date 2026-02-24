/**
 * @title Test BTC Price Validation (Generic SDK)
 * @notice Test BTC price validation using VeritasSDK with generic validate()
 */

const hre = require("hardhat");
const { ethers } = hre;
const { VeritasSDK } = require('../sdk/VeritasSDK');

const AGENT_ID = 1018;

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('           BTC PRICE VALIDATION TEST (Generic SDK)            ');
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
  
  // Build request and responseResolves (Primus SDK format)
  const request = VeritasSDK.createRequest(
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC'
  );
  
  const responseResolves = VeritasSDK.createResponseResolve(
    'btcPrice',
    '$.data.rates.USD'
  );
  
  console.log('📝 Request Config:');
  console.log('   URL:', request.url);
  console.log('   Method:', request.method);
  console.log('');
  
  console.log('📝 Response Resolve:');
  console.log('   keyName:', responseResolves[0][0].keyName);
  console.log('   parsePath:', responseResolves[0][0].parsePath);
  console.log('');
  
  // Run validation using generic validate()
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  RUNNING VALIDATION                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const result = await sdk.validate({
    agentId: AGENT_ID,
    ruleId: 0,  // BTC Price rule
    // checkIds is optional - will auto-run all checks for the rule
    request: request,
    responseResolves: responseResolves
  });
  
  // Extract BTC price from data
  const btcMatch = result.data?.match(/"btcPrice":"([^"]+)"/);
  const btcPrice = btcMatch ? btcMatch[1] : 'N/A';
  
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
  console.log('BTC Price: $' + btcPrice);
  console.log('Score:', result.score, '/ 100');
  console.log('Normalized:', result.normalizedScore, '/ 100');
  console.log('Passed:', result.passed ? '✅ YES' : '❌ NO');
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                    ✅ TEST COMPLETE!                          ');
  console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error);
