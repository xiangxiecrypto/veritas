const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  
  // Try different function signatures
  const contracts = [
    {
      name: "getAgentOwner",
      abi: ["function getAgentOwner(uint256) view returns (address)"]
    },
    {
      name: "ownerOf",
      abi: ["function ownerOf(uint256) view returns (address)"]
    },
    {
      name: "agents",
      abi: ["function agents(uint256) view returns (address)"]
    }
  ];
  
  for (const c of contracts) {
    try {
      const contract = new ethers.Contract(IDENTITY_REGISTRY, c.abi, wallet);
      const result = await contract[c.name](9999);
      console.log(c.name + ':', result);
    } catch (e) {
      console.log(c.name + ': Error -', e.reason || e.message.slice(0, 100));
    }
  }
  
  // Try registering with different function names
  console.log('\nTrying registration...');
  const registerAbis = [
    {
      name: "register",
      abi: ["function register(uint256 agentId, address owner)"]
    },
    {
      name: "createAgent",
      abi: ["function createAgent(uint256 agentId, address owner)"]
    },
    {
      name: "mint",
      abi: ["function mint(address to, uint256 agentId)"]
    }
  ];
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  for (const r of registerAbis) {
    try {
      const contract = new ethers.Contract(IDENTITY_REGISTRY, r.abi, wallet);
      const tx = await contract[r.name](9999, wallet.address, {
        gasPrice: gasPrice.mul(3),
        gasLimit: 500000
      });
      await tx.wait();
      console.log(r.name + ': Success -', tx.hash);
      break;
    } catch (e) {
      console.log(r.name + ': Error -', e.reason || e.message.slice(0, 100));
    }
  }
}

main().catch(console.error);
