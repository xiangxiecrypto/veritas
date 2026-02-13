// Example: Moltbook Agent Verification with Veritas SDK
import { VeritasSDK } from './sdk';
import { ethers } from 'ethers';

async function main() {
  // Setup provider (Base Mainnet)
  const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
  
  // Setup signer (your wallet with private key)
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  // Initialize SDK
  const veritas = new VeritasSDK({
    provider,
    signer,
    validationRegistryAddress: process.env.VALIDATION_REGISTRY_ADDRESS
  });
  
  await veritas.initialize();
  console.log('✅ Veritas SDK initialized');

  // Step 1: Register your agent identity
  const agentIdentity = {
    name: 'MyVerifiedAgent',
    platform: 'moltbook',
    twitter: '@myagent',
    created: Date.now()
  };
  
  console.log('Registering identity...');
  const tx = await veritas.registerIdentity(agentIdentity);
  await tx.wait();
  console.log('✅ Identity registered');

  // Step 2: Generate attestation for Moltbook ownership
  console.log('Generating zkTLS attestation...');
  const attestation = await veritas.verifyMoltbookAgent('MyVerifiedAgent');
  console.log('✅ Attestation generated:', attestation.attestationHash);

  // Step 3: Store on-chain
  console.log('Storing on-chain...');
  const storeTx = await veritas.storeAttestation(attestation);
  await storeTx.wait();
  console.log('✅ Attestation stored on Base L2');

  // Step 4: Anyone can verify
  const isValid = await veritas.verifyAttestation(
    await signer.getAddress(),
    attestation.attestationHash
  );
  console.log('Verification result:', isValid ? '✅ VERIFIED' : '❌ FAILED');
}

main().catch(console.error);
