/**
 * Deploy Identity Registry and Initialize VeritasValidationRegistry
 */

const hre = require("hardhat");

async function main() {
  console.log('\n🚀 Deploying Identity Registry & Initializing System\n');
  console.log('='.repeat(70));
  
  const REGISTRY_ADDRESS = "0x54be2Ce61135864D9a3c28877ab12758d027b520";
  const [signer] = await hre.ethers.getSigners();
  
  console.log('Signer:', signer.address);
  console.log('Balance:', hre.ethers.utils.formatEther(await signer.getBalance()), 'ETH\n');
  
  // ============================================
  // STEP 1: Deploy Identity Registry
  // ============================================
  console.log('📦 STEP 1: Deploy SimpleIdentityRegistry');
  console.log('─'.repeat(70));
  
  const IdentityRegistry = await hre.ethers.getContractFactory("SimpleIdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.deployed();
  
  console.log('✅ Identity Registry deployed!');
  console.log('   Address:', identityRegistry.address);
  console.log('   Tx Hash:', identityRegistry.deployTransaction.hash);
  console.log('   Explorer: https://sepolia.basescan.org/address/' + identityRegistry.address);
  console.log('');
  
  // ============================================
  // STEP 2: Initialize VeritasValidationRegistry
  // ============================================
  console.log('🔧 STEP 2: Initialize VeritasValidationRegistry');
  console.log('─'.repeat(70));
  
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = Registry.attach(REGISTRY_ADDRESS);
  
  console.log('\nCalling initialize() with identity registry:', identityRegistry.address);
  
  const tx2 = await registry.initialize(identityRegistry.address);
  console.log('Tx sent:', tx2.hash);
  
  const receipt2 = await tx2.wait();
  console.log('✅ VeritasValidationRegistry initialized!');
  console.log('   Block:', receipt2.blockNumber);
  console.log('   Gas used:', receipt2.gasUsed.toString());
  console.log('   Explorer: https://sepolia.basescan.org/tx/' + tx2.hash);
  
  // Verify
  const setRegistry = await registry.getIdentityRegistry();
  console.log('\n✅ Verification:');
  console.log('   Identity Registry set to:', setRegistry);
  console.log('');
  
  // ============================================
  // STEP 3: Register CilohPrimus Agent
  // ============================================
  console.log('📝 STEP 3: Register CilohPrimus Agent');
  console.log('─'.repeat(70));
  
  // Agent metadata JSON
  const agentMetadata = {
    "name": "CilohPrimus",
    "description": "AI agent building primus-attestation skill for verifiable API calls using zkTLS",
    "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    "services": [
      {
        "name": "moltbook",
        "endpoint": "https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus"
      }
    ]
  };
  
  const metadataUri = 'data:application/json;base64,' + Buffer.from(JSON.stringify(agentMetadata)).toString('base64');
  
  console.log('\nRegistering agent with metadata...');
  const tx3 = await identityRegistry.registerAgent(metadataUri);
  console.log('Tx sent:', tx3.hash);
  
  const receipt3 = await tx3.wait();
  const agentId = 0; // First agent
  
  console.log('✅ Agent registered!');
  console.log('   Agent ID:', agentId);
  console.log('   Owner:', signer.address);
  console.log('   Block:', receipt3.blockNumber);
  console.log('   Explorer: https://sepolia.basescan.org/tx/' + tx3.hash);
  console.log('   Metadata:', metadataUri.substring(0, 100) + '...');
  console.log('');
  
  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(70));
  console.log('✅ System Setup Complete!\n');
  console.log('Deployed Contracts:');
  console.log('  SimpleIdentityRegistry:', identityRegistry.address);
  console.log('  VeritasValidationRegistry:', REGISTRY_ADDRESS);
  console.log('');
  console.log('Registered Agent:');
  console.log('  Agent ID: 0');
  console.log('  Name: CilohPrimus');
  console.log('  Owner:', signer.address);
  console.log('');
  console.log('Transaction Links:');
  console.log('  Identity Registry Deploy: https://sepolia.basescan.org/tx/' + identityRegistry.deployTransaction.hash);
  console.log('  Registry Initialize: https://sepolia.basescan.org/tx/' + tx2.hash);
  console.log('  Agent Registration: https://sepolia.basescan.org/tx/' + tx3.hash);
  console.log('');
  console.log('Ready for verification! Use agentId = 0');
}

main().catch(console.error);
