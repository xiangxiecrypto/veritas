const hre = require("hardhat");

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('ERC-8004 REPUTATION REGISTRY');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Address:', REPUTATION_REGISTRY);
  
  // Try common ERC-8004 functions
  const registry = new ethers.Contract(
    REPUTATION_REGISTRY,
    [
      "function giveFeedback(uint256 agentId, uint8 feedback) external",
      "function getFeedback(uint256 agentId) view returns (uint8)",
      "function getReputation(uint256 agentId) view returns (uint256)",
      "function getAverageFeedback(uint256 agentId) view returns (uint256)",
      "function getFeedbackCount(uint256 agentId) view returns (uint256)"
    ],
    wallet
  );
  
  // Check agent 1018
  const agentId = 1018;
  
  try {
    const feedback = await registry.getFeedback(agentId);
    console.log('\nAgent 1018 Feedback:', feedback.toString());
  } catch (e) {
    console.log('\ngetFeedback:', e.message.slice(0, 100));
  }
  
  try {
    const reputation = await registry.getReputation(agentId);
    console.log('Reputation:', reputation.toString());
  } catch (e) {
    console.log('getReputation:', e.message.slice(0, 100));
  }
  
  try {
    const count = await registry.getFeedbackCount(agentId);
    console.log('Feedback Count:', count.toString());
  } catch (e) {
    console.log('getFeedbackCount:', e.message.slice(0, 100));
  }
  
  try {
    const avg = await registry.getAverageFeedback(agentId);
    console.log('Average Feedback:', avg.toString());
  } catch (e) {
    console.log('getAverageFeedback:', e.message.slice(0, 100));
  }
}

main().catch(console.error);
