const hre = require("hardhat");

async function main() {
  // Updated with new address
  const APP = "0x4D7Ff64A76892fdacDc7ABB53a145dE019ceE1f4";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('🎯 FINAL TEST - Agent Ownership Check Fixed');
  console.log('='.repeat(70));
  console.log('Signer:', signer.address);
  console.log('PrimusVeritasApp:', APP);
  console.log('');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Get fee
  const Task = new hre.ethers.Contract(PRIMUS, ["function queryLatestFeeInfo(uint8) view returns (tuple(uint256 primusFee, uint256 attestorFee))"], signer);
  const feeInfo = await Task.queryLatestFeeInfo(0);
  const totalFee = feeInfo.primusFee.add(feeInfo.attestorFee);
  
  console.log('Fee:', hre.ethers.utils.formatEther(totalFee), 'ETH');
  console.log('Agent ID: 0 (you own this)');
  console.log('Rule ID: 0');
  console.log('Check IDs: [0]\n');
  
  console.log('Requesting validation...');
  
  const tx = await app.requestValidation(
    0,    // agentId
    0,    // ruleId  
    [0],  // checkIds
    1,    // attestorCount
    { value: totalFee }
  );
  
  console.log('Tx sent:', tx.hash);
  const receipt = await tx.wait();
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ SUCCESS! Validation requested!');
  console.log('='.repeat(70));
  console.log('Block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
  console.log('Explorer: https://sepolia.basescan.org/tx/' + tx.hash);
  console.log('\nTransaction Links:');
  console.log('  Request: https://sepolia.basescan.org/tx/' + tx.hash);
  console.log('  App Contract: https://sepolia.basescan.org/address/' + APP);
}

main().catch(console.error);
