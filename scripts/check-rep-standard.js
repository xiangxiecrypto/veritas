const hre = require("hardhat");

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const [wallet] = await ethers.getSigners();
  
  // Try ERC-8004 standard interface
  const iface = new ethers.utils.Interface([
    "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external",
    "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
    "function getLastIndex(uint256 agentId, address clientAddress) view returns (uint64)",
    "function getClients(uint256 agentId) view returns (address[] memory)"
  ]);
  
  const registry = new ethers.Contract(REPUTATION_REGISTRY, iface, wallet);
  
  console.log('=== ERC-8004 REPUTATION REGISTRY ===\n');
  
  // Check if contract has standard functions
  const code = await ethers.provider.getCode(REPUTATION_REGISTRY);
  
  // Get selectors
  const giveFeedbackSelector = iface.getSighash('giveFeedback');
  const getSummarySelector = iface.getSighash('getSummary');
  const getClientsSelector = iface.getSighash('getClients');
  
  console.log('giveFeedback selector:', giveFeedbackSelector);
  console.log('Exists in code:', code.includes(giveFeedbackSelector.slice(2)));
  
  console.log('\ngetSummary selector:', getSummarySelector);
  console.log('Exists in code:', code.includes(getSummarySelector.slice(2)));
  
  console.log('\ngetClients selector:', getClientsSelector);
  console.log('Exists in code:', code.includes(getClientsSelector.slice(2)));
  
  // Try to get clients for agent 1018
  try {
    const clients = await registry.getClients(1018);
    console.log('\nClients for agent 1018:', clients.length);
  } catch (e) {
    console.log('\ngetClients error:', e.message.slice(0, 100));
  }
}

main().catch(console.error);
