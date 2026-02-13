/**
 * Example: Generic API Verification
 * 
 * This example shows how to verify data from any HTTPS API
 * and create a cryptographically verifiable attestation.
 * 
 * Use cases:
 * - Verify ownership of any platform with an API
 * - Prove you received specific data from a server
 * - Create audit trails of API interactions
 */

import { VeritasSDK } from '../src/sdk';
import { ethers } from 'ethers';

async function verifyAPIOwnership() {
  const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  const veritas = new VeritasSDK({
    provider,
    signer,
    network: 'mainnet'
  });
  
  await veritas.initialize();

  // First, register an agent
  console.log('Registering agent...');
  const agentId = await veritas.registerAgent({
    name: 'APIVerifier',
    description: 'Agent that verifies API data',
    services: [
      { name: 'web', endpoint: 'https://example.com' }
    ]
  });
  console.log(`Agent registered with ID: ${agentId}`);

  // Example: Verify data from any API
  // Replace with your actual API endpoint
  const apiEndpoint = 'https://api.example.com/user/profile';
  
  console.log(`\nVerifying data from: ${apiEndpoint}`);
  
  const attestation = await veritas.generateAttestation(agentId, {
    url: apiEndpoint,
    method: 'GET',
    // Add headers if the API requires authentication
    headers: process.env.API_TOKEN ? {
      'Authorization': `Bearer ${process.env.API_TOKEN}`
    } : {},
    extracts: [
      { key: 'userId', path: '$.data.id' },
      { key: 'username', path: '$.data.username' },
      { key: 'email', path: '$.data.email' }
    ]
  });

  console.log('\n✅ Attestation generated');
  console.log('Request Hash:', attestation.requestHash);
  console.log('Task ID:', attestation.taskId);
  console.log('Extracted Data:', attestation.data);
  console.log('Timestamp:', new Date(attestation.timestamp).toISOString());

  // Verify on-chain
  const verification = await veritas.verifyAttestation(attestation.requestHash);
  console.log('\nOn-chain verification:', verification.isValid ? '✅ VALID' : '❌ INVALID');
  
  return {
    agentId,
    attestationHash: attestation.requestHash,
    taskId: attestation.taskId,
    data: attestation.data
  };
}

verifyAPIOwnership().catch(console.error);
