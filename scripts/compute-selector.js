const { ethers } = require("hardhat");

async function main() {
  const targetSelector = "0x1bae8c36";
  
  // Try many variations
  const variations = [
    // Different orderings
    "giveFeedback(uint256,uint256,string,string,string,string)",
    "giveFeedback(uint256 agentId, uint256 value, string tag1, string tag2, string endpoint, string feedbackURI)",
    // Maybe uint8 instead of uint256 for value?
    "giveFeedback(uint256,uint8,string,string,string,string)",
    // Maybe int128?
    "giveFeedback(uint256,int128,string,string,string,string)",
    // Maybe 7 params?
    "giveFeedback(uint256,uint256,string,string,string,string,bytes32)",
    // Different types
    "giveFeedback(uint256 agentId, uint8 value, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
    // Test without calldata
    "giveFeedback(uint256,uint256,string,string,string,string,bytes32)",
  ];
  
  for (const sig of variations) {
    const iface = new ethers.utils.Interface([`function ${sig}`]);
    const selector = iface.getSighash('giveFeedback');
    
    if (selector === targetSelector) {
      console.log('\n✅ FOUND IT!\n');
      console.log('Signature:', sig);
      console.log('Selector:', selector);
      return;
    }
  }
  
  console.log('❌ No match found');
  console.log('Target:', targetSelector);
}

main().catch(console.error);
