const hre = require("hardhat");

const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
const AGENT_ID = 1018;

async function main() {
  const [wallet] = await ethers.getSigners();
  
  const registry = new ethers.Contract(
    REGISTRY,
    [
      "function getAgentValidations(uint256 agentId) view returns (bytes32[] memory)",
      "function validations(bytes32) view returns (tuple(address validatorAddress, uint256 agentId, string requestURI, bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag, uint256 lastUpdate))"
    ],
    wallet
  );
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('CHECKING SCORE STORAGE');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Agent ID:', AGENT_ID);
  console.log('Registry:', REGISTRY);
  
  // Get validation hashes for agent
  const hashes = await registry.getAgentValidations(AGENT_ID);
  console.log('\nValidation Hashes:', hashes.length);
  
  if (hashes.length > 0) {
    const latestHash = hashes[hashes.length - 1];
    console.log('\nLatest Hash:', latestHash);
    
    const validation = await registry.validations(latestHash);
    console.log('\nValidation Details:');
    console.log('  Validator:', validation.validatorAddress);
    console.log('  Agent ID:', validation.agentId.toString());
    console.log('  Response (Score):', validation.response, '/ 100');
    console.log('  Response Hash:', validation.responseHash);
    console.log('  Last Update:', new Date(validation.lastUpdate.toNumber() * 1000).toISOString());
  }
  
  // Check if there's a giveFeedback function
  const code = await ethers.provider.getCode(REGISTRY);
  const hasGiveFeedback = code.includes('giveFeedback');
  console.log('\nERC-8004 giveFeedback function:', hasGiveFeedback ? '✅ Found' : '❌ Not found');
}

main().catch(console.error);
