const hre = require("hardhat");

const TX_HASH = "0x47cb4980cc22738be0c0eb14cbcbb661beed2589521038ba02bab55c05187362";
const REPUTATION_REGISTRY = "0x69ad39222bf7fc5e6A90D009E4A722cF44F93FC2";

async function main() {
  const receipt = await hre.ethers.provider.getTransactionReceipt(TX_HASH);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('CALLBACK TRANSACTION LOGS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Logs:', receipt.logs.length);
  
  // FeedbackGiven event signature
  const feedbackGivenTopic = hre.ethers.utils.id("FeedbackGiven(uint256,address,uint8,uint256)");
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log('\nLog', i + 1, '- Address:', log.address);
    
    // Check if it's from ReputationRegistry
    if (log.address.toLowerCase() === REPUTATION_REGISTRY.toLowerCase()) {
      console.log('✅ FROM REPUTATION REGISTRY!');
      console.log('Topics:', log.topics);
      
      // Decode FeedbackGiven event
      if (log.topics[0] === feedbackGivenTopic) {
        console.log('✅ FeedbackGiven EVENT FOUND!');
        const agentId = hre.ethers.BigNumber.from(log.topics[1]);
        const validator = "0x" + log.topics[2].slice(26);
        console.log('   Agent ID:', agentId.toString());
        console.log('   Validator:', validator);
      }
    }
  }
  
  // Check reputation directly
  console.log('\n=== CHECKING REPUTATION ===');
  const registry = new hre.ethers.Contract(
    REPUTATION_REGISTRY,
    ["function getReputation(uint256) view returns (uint256)", "function getFeedbackCount(uint256) view returns (uint256)"],
    hre.ethers.provider
  );
  
  const rep = await registry.getReputation(1018);
  const count = await registry.getFeedbackCount(1018);
  console.log('Reputation:', rep.toString());
  console.log('Feedback Count:', count.toString());
}

main().catch(console.error);
