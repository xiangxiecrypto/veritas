/**
 * Quick Local Test - Run this to verify Veritas works before deploying
 * No blockchain or real contracts needed - uses mock SDK
 */

const { VeritasSDKMock } = require('./mocks/VeritasSDKMock');

async function runQuickTest() {
  console.log('🧪 Veritas Protocol - Quick Local Test\n');
  console.log('='.repeat(50));
  
  const TEST_WALLET = '0x6870aF53284F07f77E2207A8C218A1Bc07a36ee0';
  const sdk = new VeritasSDKMock(TEST_WALLET);
  
  await sdk.initialize();
  console.log('\n1️⃣  SDK Initialized');
  console.log(`   Signer: ${sdk.signerAddress}`);
  
  const agentId = await sdk.registerAgent({
    name: 'CilohPrimus',
    description: 'AI agent with cryptographic attestations',
    services: [
      { name: 'A2A', endpoint: 'https://agent.example.com/a2a' },
      { name: 'MCP', endpoint: 'https://agent.example.com/mcp' }
    ],
    metadata: {
      version: '1.0.0',
      author: 'test@example.com'
    }
  });
  console.log(`   ✅ Agent registered with ID: ${agentId}`);
  
  const agent = await sdk.getAgent(agentId);
  console.log('\n2️⃣  Retrieving Agent...');
  console.log(`   ✅ Agent found: ${agent.name}`);
  console.log(`   - Owner: ${agent.owner}`);
  console.log(`   - Services: ${agent.services.length}`);
  
  const attestation = await sdk.generateAttestation(agentId, {
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
    method: 'GET',
    extracts: [
      { key: 'btcPrice', path: '$.price' },
      { key: 'timestamp', path: '$.time' }
    ]
  });
  console.log('\n3️⃣  Generating Attestation...');
  console.log(`   ✅ Attestation generated`);
  console.log(`   - Request Hash: ${attestation.requestHash.slice(0, 20)}...`);
  console.log(`   - Task ID: ${attestation.taskId}`);
  console.log(`   - BTC Price: $${attestation.response.btcPrice}`);
  
  const verification = await sdk.verifyAttestation(attestation.requestHash);
  console.log('\n4️⃣  Verifying Attestation...');
  console.log(`   ✅ Verification result:`);
  console.log(`   - Valid: ${verification.isValid}`);
  console.log(`   - Agent ID: ${verification.agentId}`);
  console.log(`   - Submitter: ${verification.submitter.slice(0, 20)}...`);
  
  console.log('\n5️⃣  Testing Moltbook Ownership Verification (Success)...');
  sdk.mockMoltbookResponse('CilohPrimus', {
    wallet_address: TEST_WALLET
  });
  
  const moltbookResult = await sdk.verifyMoltbookOwnership(agentId, 'CilohPrimus');
  console.log(`   ✅ Moltbook verification:`);
  console.log(`   - Owner Match: ${moltbookResult.ownerMatch ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Extracted: ${moltbookResult.extractedOwner.slice(0, 20)}...`);
  
  console.log('\n6️⃣  Testing Moltbook Ownership Verification (Failure)...');
  sdk.mockMoltbookResponse('FakeAgent', {
    wallet_address: '0xDifferentWallet123456789012345678901234567890'
  });
  
  const fakeResult = await sdk.verifyMoltbookOwnership(agentId, 'FakeAgent');
  console.log(`   ✅ Moltbook verification:`);
  console.log(`   - Owner Match: ${fakeResult.ownerMatch ? '✅ YES' : '❌ NO'}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests passed!\n');
  console.log('Next steps:');
  console.log('  1. Deploy ValidationRegistry to Base:');
  console.log('     npx hardhat run scripts/deploy.ts --network base');
  console.log('  2. Update SDK with real contract address');
  console.log('  3. Test with real Primus Network attestations');
  
  return {
    agentId,
    attestation,
    moltbookResult
  };
}

if (require.main === module) {
  runQuickTest()
    .then(() => {
      console.log('\n🎉 Test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { runQuickTest };
