/**
 * Example: Full ERC-8004 Registration with Primus Network SDK
 * 
 * This example shows the complete flow using the decentralized Network SDK:
 * 1. Register agent on ERC-8004 Identity Registry
 * 2. Submit reputation feedback
 * 3. Generate zkTLS attestation via Primus Network (wallet-based)
 * 4. Store validation on-chain
 */

import { VeritasSDK, AgentRegistration } from '../src/sdk';
import { ethers } from 'ethers';

async function main() {
  // Setup provider (Base Mainnet)
  const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
  
  // Setup signer (REQUIRED for Network SDK)
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable required');
  }
  
  const signer = new ethers.Wallet(privateKey, provider);
  const address = await signer.getAddress();
  console.log('Wallet address:', address);

  // Initialize Veritas SDK with Network SDK
  const veritas = new VeritasSDK({
    provider,
    signer, // Required for Primus Network SDK
    network: 'mainnet',
    // validationRegistryAddress: '0x...' // Add once deployed
  });

  await veritas.initialize();
  console.log('✅ Veritas SDK initialized with Primus Network');
  console.log('Using decentralized attestation (no app credentials needed)\n');

  // ==========================================
  // STEP 1: Register Agent on ERC-8004
  // ==========================================
  console.log('--- Step 1: Register Agent on ERC-8004 ---');
  
  const registration: AgentRegistration = {
    name: 'MyVerifiedAgent',
    description: 'AI agent with decentralized zkTLS attestations via Primus Network',
    image: 'https://example.com/agent-avatar.png',
    services: [
      {
        name: 'A2A',
        endpoint: 'https://myagent.example.com/.well-known/agent-card.json',
        version: '0.3.0'
      },
      {
        name: 'MCP',
        endpoint: 'https://mcp.myagent.example.com/',
        version: '2025-06-18'
      }
    ],
    x402Support: true,
    active: true,
    supportedTrust: ['reputation', 'crypto-economic']
  };
  
  const agentId = await veritas.registerAgent(registration);
  console.log(`✅ Agent registered with ID: ${agentId}`);
  console.log(`Identity Registry: https://basescan.org/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/${agentId}\n`);

  // ==========================================
  // STEP 2: Generate zkTLS Attestation (Primus Network)
  // ==========================================
  console.log('--- Step 2: Generate zkTLS Attestation ---');
  console.log('Submitting attestation request to Primus Network...');
  
  // Example: Verify data from any HTTPS API
  const attestation = await veritas.generateAttestation(agentId, {
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    method: 'GET',
    extracts: [
      { key: 'btcPrice', path: '$.bitcoin.usd' }
    ]
  });
  
  console.log('✅ zkTLS Attestation generated via Primus Network');
  console.log('Request Hash (on-chain):', attestation.requestHash);
  console.log('Primus Task ID:', attestation.taskId);
  console.log('Extracted Data:', attestation.data);
  console.log('Timestamp:', new Date(attestation.timestamp).toISOString());

  // ==========================================
  // STEP 3: Verify On-Chain
  // ==========================================
  console.log('\n--- Step 3: Verify On-Chain ---');
  
  const verification = await veritas.verifyAttestation(attestation.requestHash);
  console.log('Validation Result:');
  console.log('  - Valid:', verification.isValid ? '✅ YES' : '❌ NO');
  console.log('  - Agent ID:', verification.agentId);
  console.log('  - Validator:', verification.validator);
  console.log('  - Response Score:', verification.response, '/ 100');

  // ==========================================
  // STEP 4: Submit Feedback
  // ==========================================
  console.log('\n--- Step 4: Submit Reputation Feedback ---');
  
  const feedbackTx = await veritas.giveFeedback(agentId, {
    value: 95,
    valueDecimals: 0,
    tag1: 'verified',
    tag2: 'api-attestation',
    endpoint: 'https://myagent.example.com/',
    feedbackURI: `ipfs://${attestation.requestHash}` // Link to attestation
  });
  await feedbackTx.wait();
  console.log('✅ Feedback submitted to Reputation Registry');

  const reputation = await veritas.getReputationSummary(agentId);
  console.log(`Reputation Score: ${reputation.averageValue}/${Math.pow(10, reputation.decimals)} (${reputation.count} reviews)\n`);

  console.log('✅ Agent fully registered and verified on ERC-8004');
  console.log('\nOther agents can now:');
  console.log('1. Discover via Identity Registry (0x8004...A432)');
  console.log('2. Check reputation via Reputation Registry (0x8004...B63)');
  console.log('3. Verify attestations cryptographically via Primus Network');
  console.log('4. Trust based on proofs, not promises');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
