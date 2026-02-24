const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  // Try ERC-721 safeMint
  const contract = new ethers.Contract(
    IDENTITY_REGISTRY,
    [
      "function safeMint(address to, uint256 tokenId)",
      "function mint(address to, uint256 tokenId)",
      "function ownerOf(uint256) view returns (address)"
    ],
    wallet
  );
  
  // Check if already exists
  try {
    const owner = await contract.ownerOf(9999);
    console.log('✅ Agent 9999 already owned by:', owner);
    return;
  } catch (e) {
    console.log('Agent 9999 not yet minted');
  }
  
  // Try safeMint
  try {
    console.log('Trying safeMint...');
    const tx = await contract.safeMint(wallet.address, 9999, {
      gasPrice: gasPrice.mul(3),
      gasLimit: 500000
    });
    await tx.wait();
    console.log('✅ safeMint success:', tx.hash);
    
    // Verify
    const owner = await contract.ownerOf(9999);
    console.log('   Owner:', owner);
    return;
  } catch (e) {
    console.log('safeMint failed:', e.reason || e.message.slice(0, 100));
  }
  
  // Try mint
  try {
    console.log('\nTrying mint...');
    const tx = await contract.mint(wallet.address, 9999, {
      gasPrice: gasPrice.mul(3),
      gasLimit: 500000
    });
    await tx.wait();
    console.log('✅ mint success:', tx.hash);
    
    // Verify
    const owner = await contract.ownerOf(9999);
    console.log('   Owner:', owner);
    return;
  } catch (e) {
    console.log('mint failed:', e.reason || e.message.slice(0, 100));
  }
}

main().catch(console.error);
