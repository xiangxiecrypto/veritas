const hre = require("hardhat");

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('=== FINDING REPUTATION REGISTRY INTERFACE ===\n');
  
  // Try different variations of giveFeedback
  const variations = [
    "function giveFeedback(uint256,uint8)",
    "function giveFeedback(uint256,uint256)",
    "function giveFeedback(uint256,int128,uint8)",
    "function giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
    "function feedback(uint256,uint8)",
    "function feedback(uint256,uint256)",
    "function setFeedback(uint256,uint8)",
    "function setFeedback(uint256,uint256)",
  ];
  
  const code = await ethers.provider.getCode(REPUTATION_REGISTRY);
  
  for (const sig of variations) {
    try {
      const iface = new ethers.utils.Interface([sig]);
      const selector = iface.getSighash(sig.split('(')[0].replace('function ', ''));
      const exists = code.includes(selector.slice(2));
      
      console.log(sig);
      console.log('  Selector:', selector);
      console.log('  Exists:', exists ? '✅' : '❌');
      console.log('');
    } catch (e) {
      console.log(sig, '- Error:', e.message.slice(0, 50));
    }
  }
  
  // Try to call with simple signature
  console.log('\n=== TRYING SIMPLE CALLS ===\n');
  
  const simpleReg = new ethers.Contract(
    REPUTATION_REGISTRY,
    [
      "function giveFeedback(uint256,uint8) external",
      "function feedback(uint256,uint8) external",
      "function getReputation(uint256) view returns (uint256)",
      "function balanceOf(uint256) view returns (uint256)"
    ],
    wallet
  );
  
  // Try to read
  try {
    const result = await simpleReg.getReputation(1018);
    console.log('getReputation(1018):', result.toString());
  } catch (e) {
    console.log('getReputation failed:', e.message.slice(0, 80));
  }
  
  try {
    const result = await simpleReg.balanceOf(1018);
    console.log('balanceOf(1018):', result.toString());
  } catch (e) {
    console.log('balanceOf failed');
  }
}

main().catch(console.error);
