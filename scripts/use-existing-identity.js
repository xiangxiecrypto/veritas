/**
 * Use existing ERC-8004 IdentityRegistry
 */

const hre = require("hardhat");

async function main() {
  console.log('\n🔧 Using Existing ERC-8004 IdentityRegistry\n');
  console.log('='.repeat(70));
  
  const REGISTRY_ADDRESS = "0x54be2Ce61135864D9a3c28877ab12758d027b520";
  const EXISTING_IDENTITY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  
  const [signer] = await hre.ethers.getSigners();
  console.log('Signer:', signer.address);
  console.log('Existing Identity Registry:', EXISTING_IDENTITY);
  console.log('');
  
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = Registry.attach(REGISTRY_ADDRESS);
  
  // Check current identity registry
  const currentIdentity = await registry.getIdentityRegistry();
  console.log('Current Identity Registry:', currentIdentity);
  
  if (currentIdentity === EXISTING_IDENTITY) {
    console.log('✅ Already using the correct identity registry!\n');
  } else {
    console.log('⚠️  Need to re-initialize with correct identity registry');
    console.log('Note: Cannot re-initialize if already set\n');
    
    // Try to check if we can call a setIdentityRegistry function
    // For now, let's assume it's already set correctly
  }
  
  // Query existing identity registry for agents owned by signer
  console.log('📋 Checking for registered agents...\n');
  
  // Try ERC-721Enumerable interface
  const IdentityInterface = new hre.ethers.utils.Interface([
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)"
  ]);
  
  const identity = new hre.ethers.Contract(EXISTING_IDENTITY, IdentityInterface, signer);
  
  try {
    const balance = await identity.balanceOf(signer.address);
    console.log('You own', balance.toString(), 'agent(s)');
    
    if (balance > 0) {
      console.log('\nYour agents:');
      for (let i = 0; i < Math.min(balance, 5); i++) {
        try {
          const agentId = await identity.tokenOfOwnerByIndex(signer.address, i);
          console.log(`  Agent ID ${i}: ${agentId.toString()}`);
        } catch (e) {
          console.log(`  Agent ID ${i}: (could not query)`);
        }
      }
      console.log('\n✅ Ready to test with existing agent!');
      console.log('Use agentId from the list above');
    } else {
      console.log('\n❌ You don\'t have any agents registered yet.');
      console.log('Need to register an agent first in the identity registry.');
    }
  } catch (e) {
    console.log('Could not query identity registry:', e.message);
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
