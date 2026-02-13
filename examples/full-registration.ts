/**
 * Example: Register an Agent on ERC-8004 and Verify with Primus zkTLS
 * 
 * This example shows:
 * 1. Registering an agent on the official ERC-8004 Identity Registry (Base Mainnet)
 * 2. Giving reputation feedback
 * 3. Generating a zkTLS attestation via Primus
 * 4. Storing the validation on-chain
 */

import { VeritasSDK, AgentRegistration } from '../src/sdk';
import { ethers } from 'ethers';

async function main() {
  // Setup provider (Base Mainnet)
  const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
  
  // Setup signer
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const address = await signer.getAddress();
  console.log('Using address:', address);
  
  // Initialize Veritas SDK
  const veritas = new VeritasSDK({
    provider,
    signer,
    network: 'mainnet',
    // validationRegistryAddress: '0x...' // Add once deployed
  });
  
  await veritas.initialize();
  console.log('✅ Veritas SDK initialized');
  console.log('Connected to ERC-8004 on Base Mainnet');

  // ==========================================
  // STEP 1: Register Agent on ERC-8004 Identity Registry
  // ==========================================
  console.log('\n--- Step 1: Register Agent ---');
  
  const registration: AgentRegistration = {
    name: 'MyVerifiedAgent',
    description: 'An AI agent with cryptographically verifiable attestations using Primus zkTLS',
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
      },
      {
        name: 'web',
        endpoint: 'https://myagent.example.com/'
      },
      {
        name: 'DID',
        endpoint: 'did:ethr:' + address,
        version: 'v1'
      }
    ],
    x402Support: true,
    active: true,
    supportedTrust: ['reputation', 'crypto-economic', 'tee-attestation']
  };
  
  console.log('Registering agent...');
  const agentId = await veritas.registerAgent(registration);
  console.log(`✅ Agent registered with ID: ${agentId}`);
  console.log(`View on-chain: https://basescan.org/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/${agentId}`);

  // ==========================================
  // STEP 2: Give Reputation Feedback (ERC-8004)
  // ==========================================
  console.log('\n--- Step 2: Submit Feedback ---');
  
  // This would normally be done by a client after using the agent
  const feedbackTx = await veritas.giveFeedback(agentId, {
    value: 95, // 95/100 quality score
    valueDecimals: 0,
    tag1: 'starred', // Quality rating
    tag2: 'initial',
    endpoint: 'https://myagent.example.com/',
    feedbackURI: 'ipfs://Qm...' // Optional: link to detailed review
  });
  await feedbackTx.wait();
  console.log('✅ Feedback submitted to Reputation Registry');

  // Get reputation summary
  const reputation = await veritas.getReputationSummary(agentId);
  console.log(`Reputation: ${reputation.count} reviews, avg ${reputation.averageValue}/${Math.pow(10, reputation.decimals)}`);

  // ==========================================
  // STEP 3: Generate zkTLS Attestation (Primus)
  // ==========================================
  console.log('\n--- Step 3: Generate zkTLS Attestation ---');
  
  // Verify the agent's Twitter/X ownership cryptographically
  const attestation = await veritas.generateAttestation(agentId, {
    url: 'https://api.twitter.com/2/users/by/username/myverifiedagent',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
    },
    responsePath: '$.data.id' // Extract Twitter user ID
  });
  
  console.log('✅ zkTLS Attestation generated');
  console.log('Proof Hash:', attestation.proofHash);
  console.log('Request Hash:', attestation.requestHash);
  console.log('Timestamp:', new Date(attestation.timestamp).toISOString());

  // ==========================================
  // STEP 4: Verify On-Chain
  // ==========================================
  console.log('\n--- Step 4: Verify Attestation On-Chain ---');
  
  const verification = await veritas.verifyAttestation(attestation.requestHash);
  console.log('Validation Result:');
  console.log('  - Valid:', verification.isValid);
  console.log('  - Agent ID:', verification.agentId);
  console.log('  - Validator:', verification.validator);
  console.log('  - Response Score:', verification.response, '/ 100');
  console.log('  - Timestamp:', new Date(verification.timestamp * 1000).toISOString());

  console.log('\n✅ Agent fully registered and verified on ERC-8004');
  console.log('\nOther agents can now:');
  console.log('1. Discover your agent via Identity Registry (0x8004...A432)');
  console.log('2. Check reputation via Reputation Registry (0x8004...B63)');
  console.log('3. Verify attestations via Validation Registry');
  console.log('4. Trust your agent based on cryptographic proofs, not promises');
}

main().catch(console.error);
