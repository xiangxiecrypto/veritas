/**
 * End-to-End Example: Veritas + ReputationRegistry
 * 
 * This example demonstrates the complete trust-building flow:
 * 1. Alice registers her agent
 * 2. Alice verifies Moltbook ownership (proves she controls the agent)
 * 3. Bob verifies Alice's attestation and gives feedback
 * 4. Carol checks Alice's reputation before trusting her
 * 5. Over time, Alice builds reputation through verified attestations
 */

import { VeritasSDK, AgentRegistration } from '../src/sdk';
import { ethers } from 'ethers';

// ==========================================
// SETUP: Two different wallets (Alice & Bob)
// ==========================================

// Alice's wallet (agent owner)
const ALICE_PRIVATE_KEY = process.env.ALICE_PRIVATE_KEY!;
const aliceProvider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
const aliceSigner = new ethers.Wallet(ALICE_PRIVATE_KEY, aliceProvider);

// Bob's wallet (user who gives feedback)
const BOB_PRIVATE_KEY = process.env.BOB_PRIVATE_KEY!;
const bobProvider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
const bobSigner = new ethers.Wallet(BOB_PRIVATE_KEY, bobProvider);

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  END-TO-END: Veritas + ReputationRegistry');
  console.log('  Building Trust Through Verified Attestations');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==========================================
  // PART 1: ALICE SETS UP HER AGENT
  // ==========================================
  console.log('👤 ALICE: Creating her agent...\n');

  const aliceSDK = new VeritasSDK({
    provider: aliceProvider,
    signer: aliceSigner,
    network: 'mainnet'
  });
  await aliceSDK.initialize();

  const aliceAddress = await aliceSigner.getAddress();
  console.log(`Alice's wallet: ${aliceAddress}`);

  // Alice registers her agent on ERC-8004
  const aliceRegistration: AgentRegistration = {
    name: 'AliceOracle',
    description: 'AI oracle providing verified crypto price data with zkTLS attestations',
    image: 'https://example.com/alice-avatar.png',
    services: [
      {
        name: 'A2A',
        endpoint: 'https://aliceoracle.example.com/.well-known/agent-card.json',
        version: '0.3.0',
        skills: ['price-feeds', 'market-data']
      }
    ],
    x402Support: true,
    active: true,
    supportedTrust: ['reputation', 'crypto-economic']
  };

  const aliceAgentId = await aliceSDK.registerAgent(aliceRegistration);
  console.log(`✅ Alice registered agent with ID: ${aliceAgentId}\n`);

  // ==========================================
  // PART 2: ALICE VERIFIES MOLTBOOK OWNERSHIP
  // ==========================================
  console.log('🔍 ALICE: Proving Moltbook ownership...\n');

  // Alice has a Moltbook agent called "AliceOracle"
  // She generates a zkTLS attestation proving she owns it
  const { attestation, ownerMatch, extractedOwner } = await aliceSDK.verifyMoltbookOwnership(
    aliceAgentId,
    'AliceOracle'  // Her Moltbook agent name
  );

  console.log('Attestation generated:');
  console.log(`  Request Hash: ${attestation.requestHash}`);
  console.log(`  Task ID: ${attestation.taskId}`);
  console.log(`  Extracted Owner: ${extractedOwner}`);
  console.log(`  Owner Match: ${ownerMatch ? '✅ YES' : '❌ NO'}`);

  if (ownerMatch) {
    console.log('\n✅ Alice has cryptographically proven she owns "AliceOracle" on Moltbook');
    console.log('   This proof is stored on-chain and can be verified by anyone\n');
  }

  // ==========================================
  // PART 3: BOB VERIFIES AND GIVES FEEDBACK
  // ==========================================
  console.log('👤 BOB: Verifying Alice and giving feedback...\n');

  const bobSDK = new VeritasSDK({
    provider: bobProvider,
    signer: bobSigner,
    network: 'mainnet'
  });
  await bobSDK.initialize();

  const bobAddress = await bobSigner.getAddress();
  console.log(`Bob's wallet: ${bobAddress}`);

  // Bob verifies Alice's attestation on-chain
  const verification = await bobSDK.verifyAttestation(attestation.requestHash);
  console.log('\nBob verifies Alice\'s attestation:');
  console.log(`  Valid: ${verification.isValid ? '✅ YES' : '❌ NO'}`);
  console.log(`  Agent ID: ${verification.agentId}`);
  console.log(`  Response Score: ${verification.response}/100`);

  if (verification.isValid) {
    // Bob is satisfied, gives positive feedback
    console.log('\n✅ Bob trusts Alice\'s verification and gives positive feedback');
    
    const feedbackTx = await bobSDK.giveFeedback(aliceAgentId, {
      value: 95,              // High score: 95/100
      valueDecimals: 0,
      tag1: 'verified',       // Category: verified ownership
      tag2: 'moltbook',       // Platform: Moltbook
      endpoint: 'https://www.moltbook.com/u/AliceOracle',
      feedbackURI: `data:application/json;base64,${Buffer.from(JSON.stringify({
        attestationHash: attestation.requestHash,
        verifiedBy: bobAddress,
        comment: 'Verified Moltbook ownership via zkTLS'
      })).toString('base64')}`
    });
    await feedbackTx.wait();
    console.log('✅ Bob submitted feedback: 95/100 (tag: verified, moltbook)\n');
  }

  // ==========================================
  // PART 4: MORE USERS GIVE FEEDBACK (Simulation)
  // ==========================================
  console.log('👥 MORE USERS: Giving feedback over time...\n');

  // Simulate multiple users giving feedback
  const feedbacks = [
    { value: 92, tag1: 'accurate', tag2: 'data' },
    { value: 98, tag1: 'verified', tag2: 'moltbook' },
    { value: 88, tag1: 'reliable', tag2: 'prices' },
    { value: 95, tag1: 'verified', tag2: 'moltbook' },
    { value: 91, tag1: 'accurate', tag2: 'data' }
  ];

  for (const fb of feedbacks) {
    const tx = await bobSDK.giveFeedback(aliceAgentId, {
      value: fb.value,
      valueDecimals: 0,
      tag1: fb.tag1,
      tag2: fb.tag2,
      endpoint: 'https://www.moltbook.com/u/AliceOracle',
      feedbackURI: ''
    });
    await tx.wait();
    console.log(`  User feedback: ${fb.value}/100 (tags: ${fb.tag1}, ${fb.tag2})`);
  }

  // ==========================================
  // PART 5: CAROL CHECKS ALICE'S REPUTATION
  // ==========================================
  console.log('\n👤 CAROL: Checking Alice\'s reputation before trusting...\n');

  // Carol queries Alice's overall reputation
  const overallRep = await bobSDK.getReputationSummary(aliceAgentId);
  console.log('Alice\'s Overall Reputation:');
  console.log(`  Total Reviews: ${overallRep.count}`);
  console.log(`  Average Score: ${overallRep.averageValue.toFixed(1)}/100`);

  // Carol checks specifically for "verified" + "moltbook" combinations
  const verifiedRep = await bobSDK.getReputationSummary(
    aliceAgentId,
    [],           // All clients
    'verified',   // Must have "verified" tag
    'moltbook'    // Must have "moltbook" tag
  );

  console.log('\nAlice\'s Verified Moltbook Reputation:');
  console.log(`  Verified Reviews: ${verifiedRep.count}`);
  console.log(`  Verified Score: ${verifiedRep.averageValue.toFixed(1)}/100`);

  // Carol checks for "accurate" + "data" (data quality)
  const dataRep = await bobSDK.getReputationSummary(
    aliceAgentId,
    [],
    'accurate',
    'data'
  );

  console.log('\nAlice\'s Data Quality Reputation:');
  console.log(`  Data Reviews: ${dataRep.count}`);
  console.log(`  Data Score: ${dataRep.averageValue.toFixed(1)}/100`);

  // ==========================================
  // PART 6: CAROL'S DECISION
  // ==========================================
  console.log('\n📊 CAROL\'S TRUST DECISION:\n');

  const minReviews = 3;
  const minScore = 80;

  if (overallRep.count >= minReviews && overallRep.averageValue >= minScore) {
    console.log('✅ Carol TRUSTS Alice because:');
    console.log(`   - ${overallRep.count} reviews (min: ${minReviews})`);
    console.log(`   - ${overallRep.averageValue.toFixed(1)}/100 score (min: ${minScore})`);
    console.log(`   - ${verifiedRep.count} verified Moltbook reviews`);
    console.log(`   - Cryptographic proof of ownership (attestation: ${attestation.requestHash.slice(0, 20)}...)`);
    console.log('\n✅ Carol decides to use Alice\'s oracle services\n');
  } else {
    console.log('⚠️ Carol does NOT trust Alice yet:');
    console.log(`   - Needs more reviews (${overallRep.count}/${minReviews})`);
    console.log(`   - Or higher score (${overallRep.averageValue.toFixed(1)}/${minScore})`);
  }

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  END-TO-END FLOW COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Trust Built Through:');
  console.log('1. Alice registered agent on ERC-8004 Identity Registry');
  console.log('2. Alice verified Moltbook ownership via zkTLS attestation');
  console.log('3. Bob verified the attestation and gave positive feedback');
  console.log('4. Multiple users gave feedback over time');
  console.log('5. Carol checked reputation and decided to trust Alice\n');

  console.log('On-Chain Records:');
  console.log(`  Identity:  https://basescan.org/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/${aliceAgentId}`);
  console.log(`  Reputation: https://basescan.org/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`);
  console.log(`  Attestation: ${attestation.requestHash}\n`);

  console.log('Key Insight:');
  console.log('  Trust = Verification (attestation) + Social Proof (reputation)');
  console.log('  Both stored on-chain, transparent and auditable');
}

// Run the example
main().catch(err => {
  console.error('Error:', err.message);
  console.error('\nNote: This example requires two wallets with ETH on Base:');
  console.error('  - ALICE_PRIVATE_KEY: Agent owner');
  console.error('  - BOB_PRIVATE_KEY: User giving feedback');
  process.exit(1);
});
