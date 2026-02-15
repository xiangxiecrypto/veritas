const { ethers } = require("ethers");

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
const RPC_URL = "https://sepolia.base.org";

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  const abi = [
    "function reputationCount(uint256) view returns (uint256)",
    "function reputationSum(uint256) view returns (int128)",
    "function getReputation(uint256 agentId, string tag1, string tag2) view returns (int128 value, uint256 count)"
  ];
  
  const contract = new ethers.Contract(REPUTATION_REGISTRY, abi, provider);
  
  const agentId = 1;
  
  console.log("\n📊 Reputation Registry Analysis");
  console.log(`Contract: ${REPUTATION_REGISTRY}\n`);
  
  try {
    const totalCount = await contract.reputationCount(agentId);
    console.log(`Total Reputation Count (Agent ${agentId}): ${totalCount}`);
    
    const sum = await contract.reputationSum(agentId);
    console.log(`Total Reputation Sum: ${sum.toString()}`);
    
    if (totalCount > 0) {
      const avg = Number(sum) / Number(totalCount);
      console.log(`Average Score: ${avg.toFixed(2)}`);
    }
    
    const primusRep = await contract.getReputation(agentId, "primus-zktls", "");
    console.log(`\n🔍 Primus zktls Reputation:`);
    console.log(`  Value: ${primusRep.value.toString()}`);
    console.log(`  Count: ${primusRep.count.toString()}`);
    
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main().catch(console.error);
