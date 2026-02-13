// Example: Twitter/X Ownership Verification
import { VeritasSDK } from '../src/sdk';
import { ethers } from 'ethers';

async function verifyTwitterOwnership() {
  const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  const veritas = new VeritasSDK({
    provider,
    signer,
    validationRegistryAddress: process.env.VALIDATION_REGISTRY_ADDRESS
  });
  
  await veritas.initialize();

  // Verify Twitter account ownership
  const twitterHandle = 'myverifiedbot';
  
  console.log(`Verifying ownership of @${twitterHandle}...`);
  
  const attestation = await veritas.generateAttestation({
    url: `https://api.twitter.com/2/users/by/username/${twitterHandle}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
    },
    responsePath: '$.data.id' // Extract Twitter user ID
  });

  console.log('Attestation generated:', attestation.attestationHash);
  console.log('Timestamp:', new Date(attestation.timestamp).toISOString());

  // Store proof on-chain
  const tx = await veritas.storeAttestation(attestation);
  await tx.wait();
  
  console.log('✅ Twitter ownership verified and stored on-chain');
  
  // Share this proof with others
  return {
    attestationHash: attestation.attestationHash,
    proof: attestation.proof,
    verifier: await signer.getAddress()
  };
}

verifyTwitterOwnership().catch(console.error);
