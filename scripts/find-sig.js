const hre = require("hardhat");

async function main() {
  const selector = "0x1bae8c36";
  
  // Try different parameter orders based on ERC-8004
  const signatures = [
    "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
    "giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
    // Maybe parameters in different order?
    "giveFeedback(uint256 agentId, uint8 valueDecimals, int128 value, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
  ];
  
  for (const sig of signatures) {
    const iface = new hre.ethers.utils.Interface([`function ${sig}`]);
    const computed = iface.getSighash('giveFeedback');
    console.log('Signature:', sig);
    console.log('Selector:', computed);
    console.log('Match:', computed === selector ? '✅ YES!' : '❌');
    console.log('');
  }
  
  // Try using the full ERC-8004 standard
  const erc8004 = new hre.ethers.utils.Interface([
    "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external"
  ]);
  
  const selector8004 = erc8004.getSighash('giveFeedback');
  console.log('ERC-8004 Standard Selector:', selector8004);
  console.log('Match:', selector8004 === selector ? '✅' : '❌');
}

main().catch(console.error);
