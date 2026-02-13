/**
 * Moltbook Agent Verification Example
 * 
 * This example verifies that an agent's registered owner matches
 * the wallet address that creates the attestation.
 * 
 * Flow:
 * 1. Register agent on ERC-8004 Identity Registry
 * 2. Fetch agent data from Moltbook API
 * 3. Generate zkTLS attestation proving Moltbook ownership
 * 4. Verify on-chain that attestation matches registered owner
 */

import { VeritasSDK, AgentRegistration } from '../src/sdk';
import { ethers } from 'ethers';

async function main() {
  // Setup
  const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const walletAddress = await signer.getAddress();
  
  console.log('Wallet address:', walletAddress);
  
  const veritas = new VeritasSDK({
    provider,
    signer,
    network: 'mainnet'
  });
  
  await veritas.initialize();
  console.log('✅ Veritas SDK initialized\n');

  const MOLTBOOK_AGENT_NAME = 'CilohPrimus'; // Your Moltbook agent name

  // ==========================================
  // STEP 1: Register Agent on ERC-8004
  // ==========================================
  console.log('--- Step 1: Register Agent ---');
  
  const registration: AgentRegistration = {
    name: MOLTBOOK_AGENT_NAME,
    description: `AI agent registered on Moltbook with cryptographically verifiable ownership`,
    image: '',
    services: [
      {
        name: 'Moltbook',
        endpoint: `https://www.moltbook.com/u/${MOLTBOOK_AGENT_NAME}`,
        version: 'v1'
      },
      {
        name: 'A2A',
        endpoint: `https://www.moltbook.com/api/v1/agents/${MOLTBOOK_AGENT_NAME}`,
        version: '0.3.0'
      }
    ],
    x402Support: false,
    active: true,
    supportedTrust: ['reputation', 'crypto-economic']
  };
  
  const agentId = await veritas.registerAgent(registration);
  console.log(`✅ Agent registered with ERC-8004 ID: ${agentId}`);

  // ==========================================
  // STEP 2: Generate zkTLS Attestation
  // Prove ownership via Moltbook API (NOT Twitter)
  // ==========================================
  console.log('\n--- Step 2: Generate zkTLS Attestation via Moltbook API ---');
  console.log(`Fetching agent data from Moltbook for: ${MOLTBOOK_AGENT_NAME}`);
  
  // This attestation proves:
  // 1. We called Moltbook's API
  // 2. The API returned this specific wallet as the owner
  // 3. The proof is cryptographically verifiable
  const attestation = await veritas.generateAttestation(agentId, {
    url: `https://www.moltbook.com/api/v1/agents/${MOLTBOOK_AGENT_NAME}`,
    method: 'GET',
    extracts: [
      { key: 'agentName', path: '$.agent.name' },
      { key: 'ownerAddress', path: '$.agent.wallet_address' },
      { key: 'agentId', path: '$.agent.id' }
    ]
  });
  
  console.log('✅ zkTLS Attestation generated from Moltbook API');
  console.log('Request Hash:', attestation.requestHash);
  console.log('Task ID:', attestation.taskId);
  console.log('Extracted Data:', attestation.data);

  // ==========================================
  // STEP 3: Verify Ownership Match
  // ==========================================
  console.log('\n--- Step 3: Verify Ownership Match ---');
  
  const extractedOwner = attestation.data.ownerAddress?.toLowerCase();
  const registeredOwner = walletAddress.toLowerCase();
  
  console.log('Extracted Owner (from Moltbook):', extractedOwner);
  console.log('Registered Owner (your wallet):', registeredOwner);
  
  if (extractedOwner === registeredOwner) {
    console.log('✅ OWNERSHIP VERIFIED: Moltbook owner matches registered wallet');
  } else {
    console.log('❌ OWNERSHIP MISMATCH: Moltbook owner does not match registered wallet');
    console.log('This could mean:');
    console.log('  - Wrong wallet being used');
    console.log('  - Agent not claimed yet on Moltbook');
    console.log('  - Someone else owns this agent name');
  }

  // ==========================================
  // STEP 4: Verify On-Chain
  // ==========================================
  console.log('\n--- Step 4: Verify Attestation On-Chain ---');
  
  const verification = await veritas.verifyAttestation(attestation.requestHash);
  console.log('On-chain Validation:');
  console.log('  - Valid:', verification.isValid ? '✅ YES' : '❌ NO');
  console.log('  - Agent ID:', verification.agentId);
  console.log('  - Response Score:', verification.response, '/ 100');
  console.log('  - Timestamp:', new Date(verification.timestamp * 1000).toISOString());

  // ==========================================
  // STEP 5: Submit Reputation Feedback
  // ==========================================
  console.log('\n--- Step 5: Submit Reputation Feedback ---');
  
  const feedbackTx = await veritas.giveFeedback(agentId, {
    value: 100, // 100/100 for verified ownership
    valueDecimals: 0,
    tag1: 'verified',
    tag2: 'moltbook',
    endpoint: `https://www.moltbook.com/u/${MOLTBOOK_AGENT_NAME}`,
    feedbackURI: `data:application/json;base64,${Buffer.from(JSON.stringify({
      moltbookAgent: MOLTBOOK_AGENT_NAME,
      attestationHash: attestation.requestHash,
      ownerVerified: extractedOwner === registeredOwner
    })).toString('base64')}`
  });
  await feedbackTx.wait();
  console.log('✅ Feedback submitted to ERC-8004 Reputation Registry');

  console.log('\n========================================');
  console.log('VERIFICATION COMPLETE');
  console.log('========================================');
  console.log(`Moltbook Agent: ${MOLTBOOK_AGENT_NAME}`);
  console.log(`ERC-8004 ID: ${agentId}`);
  console.log(`Attestation: ${attestation.requestHash}`);
  console.log(`Status: ${extractedOwner === registeredOwner ? '✅ VERIFIED' : '❌ MISMATCH'}`);
  console.log('\nOther agents can now:');
  console.log('1. Check your reputation on ReputationRegistry (0x8004...B63)');
  console.log('2. Verify your Moltbook ownership cryptographically');
  console.log('3. Trust that you control both the agent and the wallet');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
