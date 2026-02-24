const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
  const agentId = 1018;
  
  const registry = new ethers.Contract(
    REGISTRY,
    [
      "function getAgentValidations(uint256 agentId) view returns (bytes32[] memory)"
    ],
    wallet
  );
  
  console.log('=== FINAL SCORE CHECK ===\n');
  console.log('Agent ID:', agentId);
  
  const validations = await registry.getAgentValidations(agentId);
  console.log('Validation Count:', validations.length);
  
  if (validations.length > 0) {
    console.log('\nValidation Hashes:');
    validations.forEach((hash, i) => {
      console.log(`  ${i+1}. ${hash}`);
    });
  }
}

main().catch(console.error);
