/**
 * Deploy ERC-8004 Identity Registry and Initialize VeritasValidationRegistry
 */

const hre = require("hardhat");

async function main() {
  console.log('\n🚀 Deploying ERC-8004 Identity Registry\n');
  console.log('='.repeat(70));
  
  const REGISTRY_ADDRESS = "0x54be2Ce61135864D9a3c28877ab12758d027b520";
  const [signer] = await hre.ethers.getSigners();
  
  console.log('Signer:', signer.address);
  console.log('Balance:', hre.ethers.utils.formatEther(await signer.getBalance()), 'ETH\n');
  
  // ============================================
  // Deploy Identity Registry (ERC-721 based)
  // ============================================
  console.log('📦 Deploying Identity Registry (ERC-8004)...');
  console.log('─'.repeat(70));
  
  // We need a simple ERC-721 contract for agent identity
  // For now, let's use a basic ERC721 with name/symbol
  const IdentityRegistry = await hre.ethers.getContractFactory(
    "@openzeppelin/contracts/token/ERC721/ERC721.sol:ERC721"
  );
  
  // Actually, let's create a simple identity registry
  const SimpleIdentityRegistry = await hre.ethers.getContractFactory(
    `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract SimpleIdentityRegistry is ERC721URIStorage {
    uint256 public nextAgentId;
    
    constructor() ERC721("VeritasAgent", "VAGENT") {}
    
    function registerAgent(string memory uri) external returns (uint256) {
        uint256 agentId = nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, uri);
        return agentId;
    }
    
    function getAgentCount() external view returns (uint256) {
        return nextAgentId;
    }
}`
  );
  
  // Actually, let me create a separate file
}

main().catch(console.error);
