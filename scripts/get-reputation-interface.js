const hre = require("hardhat");

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const code = await ethers.provider.getCode(REPUTATION_REGISTRY);
  
  // Check for common function selectors
  const selectors = {
    'giveFeedback(uint256,uint8)': '0x...',
    'giveFeedback(uint256,uint256)': '0x...',
    'getFeedback(uint256)': '0x...',
    'getReputation(uint256)': '0x...',
    'balanceOf(uint256)': '0x...'
  };
  
  console.log('Contract code length:', (code.length - 2) / 2, 'bytes\n');
  
  // Common ERC-8004 selectors
  const ERC8004_FUNCTIONS = [
    '0x70a08231', // balanceOf
    '0x18160ddd', // totalSupply
    '0x6352211e', // ownerOf
    '0x...', // giveFeedback - need to calculate
  ];
  
  // Calculate giveFeedback selector
  const iface = new ethers.utils.Interface([
    "function giveFeedback(uint256 agentId, uint8 feedback)",
    "function giveFeedback(uint256 agentId, uint256 feedback)"
  ]);
  
  console.log('giveFeedback(uint256,uint8):', iface.getSighash('giveFeedback(uint256,uint8)'));
  console.log('giveFeedback(uint256,uint256):', iface.getSighash('giveFeedback(uint256,uint256)'));
  
  // Check if they exist
  const sig1 = iface.getSighash('giveFeedback(uint256,uint8)').slice(2);
  const sig2 = iface.getSighash('giveFeedback(uint256,uint256)').slice(2);
  
  console.log('\ngiveFeedback(uint8) exists:', code.includes(sig1));
  console.log('giveFeedback(uint256) exists:', code.includes(sig2));
}

main().catch(console.error);
