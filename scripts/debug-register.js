const hre = require("hardhat");
const { ethers } = hre;

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const ABI = [
  "function register() returns (uint256)",
  "function register(string agentURI) returns (uint256)",
  "function ownerOf(uint256 agentId) view returns (address)"
];

async function main() {
  const [wallet] = await ethers.getSigners();
  
  const registry = new ethers.Contract(IDENTITY_REGISTRY, ABI, wallet);
  
  console.log('Contract functions:', Object.keys(registry.functions).filter(k => k.includes('register')));
  console.log('');
  console.log('register function:', typeof registry.register);
  console.log('');
  
  // Try calling
  try {
    console.log('Calling register()...');
    const tx = await registry.register();
    console.log('Tx:', tx.hash);
    const receipt = await tx.wait();
    console.log('Success! Gas:', receipt.gasUsed.toString());
    
    // Get agent ID from event
    for (const log of receipt.logs) {
      console.log('Log:', log.topics[0]?.slice(0, 20));
    }
  } catch (e) {
    console.log('Error:', e.message.slice(0, 200));
  }
}

main().catch(console.error);
