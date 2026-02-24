const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
  const agentId = 1018;
  
  const registry = new ethers.Contract(
    REGISTRY,
    [
      "function getValidationCount(uint256 agentId) view returns (uint256)",
      "function getValidation(uint256 agentId, uint256 index) view returns (tuple(uint256 ruleId, uint256 score, uint256 timestamp, bytes32 attestationHash))",
      "function getTotalScore(uint256 agentId) view returns (uint256)"
    ],
    wallet
  );
  
  console.log('=== FINAL SCORE CHECK ===\n');
  console.log('Agent ID:', agentId);
  
  try {
    const validationCount = await registry.getValidationCount(agentId);
    console.log('Validation Count:', validationCount.toString());
    
    if (validationCount.gt(0)) {
      const validation = await registry.getValidation(agentId, validationCount.sub(1));
      console.log('\nLatest Validation:');
      console.log('  Rule ID:', validation.ruleId.toString());
      console.log('  Score:', validation.score.toString());
      console.log('  Timestamp:', new Date(validation.timestamp.toNumber() * 1000).toISOString());
      console.log('  Attestation Hash:', validation.attestationHash);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
