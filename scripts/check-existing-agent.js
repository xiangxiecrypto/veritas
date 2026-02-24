const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  
  const contract = new ethers.Contract(
    IDENTITY_REGISTRY,
    ["function ownerOf(uint256) view returns (address)"],
    wallet
  );
  
  // Check some known agent IDs
  const agentIds = [674, 1018, 9999, 1, 2, 100, 200, 500, 1000];
  
  for (const agentId of agentIds) {
    try {
      const owner = await contract.ownerOf(agentId);
      const isMyAgent = owner.toLowerCase() === wallet.address.toLowerCase();
      console.log('Agent', agentId, ':', owner.slice(0, 12) + '...', isMyAgent ? '✅ MINE' : '');
    } catch (e) {
      // console.log('Agent', agentId, ': not minted');
    }
  }
}

main().catch(console.error);
