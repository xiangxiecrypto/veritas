const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const identityRegistry = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
  
  // ERC-8004 IdentityRegistry interface
  const iface = new ethers.utils.Interface([
    // ERC-721 base
    'function balanceOf(address) view returns (uint256)',
    'function ownerOf(uint256) view returns (address)',
    // ERC-8004 Metadata
    'function tokenURI(uint256) view returns (string)',
    'function name() view returns (string)',
    'function symbol() view returns (string)'
  ]);
  
  const contract = new ethers.Contract(identityRegistry, iface, provider);
  
  const owner = '0x89BBf3451643eef216c3A60d5B561c58F0D8adb9';
  
  console.log('Checking IdentityRegistry:', identityRegistry);
  console.log('Owner:', owner);
  
  try {
    const balance = await contract.balanceOf(owner);
    console.log('Balance:', balance.toString());
    
    // The check: ownerOf(agentId) - if no revert, agent is registered
    console.log('\nChecking registered agents:');
    for (let i = 1; i <= 12; i++) {
      try {
        const agentOwner = await contract.ownerOf(i);
        console.log(`Agent ${i}: registered, owner = ${agentOwner}`);
      } catch (e) {
        console.log(`Agent ${i}: NOT registered`);
      }
    }
    
    // Check tokenURI for metadata
    try {
      const uri = await contract.tokenURI(1);
      console.log('\nTokenURI(1):', uri);
    } catch (e) {
      console.log('tokenURI not available');
    }
    
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main();
