/**
 * @title Check Primus Fee Structure
 * @notice Query Primus TaskContract to see current fees
 */

const hre = require("hardhat");
const { ethers } = hre;

// Primus TaskContract ABI (minimal)
const TASK_ABI = [
  "function queryLatestFeeInfo(uint8 tokenSymbol) view returns (tuple(uint256 primusFee, uint256 attestorFee, uint64 settedAt))",
  "function owner() view returns (address)"
];

async function main() {
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const [signer] = await ethers.getSigners();
  const task = new ethers.Contract(PRIMUS_TASK, TASK_ABI, signer);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         PRIMUS TASK CONTRACT FEE STRUCTURE                      ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('Contract:', PRIMUS_TASK);
  console.log('Network:', hre.network.name);
  console.log('');
  
  try {
    // Query fee info for ETH (tokenSymbol = 0)
    const feeInfo = await task.queryLatestFeeInfo(0);
    
    console.log('Fee Structure (ETH payments):');
    console.log('  Primus Fee:    ', ethers.utils.formatEther(feeInfo.primusFee), 'ETH');
    console.log('  Attestor Fee:  ', ethers.utils.formatEther(feeInfo.attestorFee), 'ETH');
    console.log('  Total Fee:     ', ethers.utils.formatEther(feeInfo.primusFee.add(feeInfo.attestorFee)), 'ETH');
    console.log('  Set At:        ', new Date(feeInfo.settedAt * 1000).toISOString());
    console.log('');
    
    // Calculate USD values (assuming $2500/ETH)
    const ethPrice = 2500;
    const primusFeeUsd = parseFloat(ethers.utils.formatEther(feeInfo.primusFee)) * ethPrice;
    const attestorFeeUsd = parseFloat(ethers.utils.formatEther(feeInfo.attestorFee)) * ethPrice;
    const totalFeeUsd = primusFeeUsd + attestorFeeUsd;
    
    console.log('USD Value (ETH = $2500):');
    console.log('  Primus Fee:    $', primusFeeUsd.toFixed(6));
    console.log('  Attestor Fee:  $', attestorFeeUsd.toFixed(6));
    console.log('  Total Fee:     $', totalFeeUsd.toFixed(6));
    console.log('');
    
    // Compare with attestor costs
    const attestorGasCostUsd = 0.0006;  // From our analysis
    const attestorInfraCostUsd = 0.02;  // Conservative estimate
    const attestorTotalCost = attestorGasCostUsd + attestorInfraCostUsd;
    
    console.log('Attestor Economics:');
    console.log('  Gas Cost:      $', attestorGasCostUsd.toFixed(6));
    console.log('  Infra Cost:    $', attestorInfraCostUsd.toFixed(6));
    console.log('  Total Cost:    $', attestorTotalCost.toFixed(6));
    console.log('  Fee Earned:    $', attestorFeeUsd.toFixed(6));
    console.log('  Net Profit:    $', (attestorFeeUsd - attestorTotalCost).toFixed(6));
    console.log('');
    
    if (attestorFeeUsd < attestorTotalCost) {
      console.log('⚠️  ATTESTORS OPERATING AT LOSS');
      console.log('   Need to increase attestor fee by: $', (attestorTotalCost - attestorFeeUsd).toFixed(6));
    } else {
      console.log('✅ Attestors are profitable!');
    }
    console.log('');
    
    // Check contract owner
    try {
      const owner = await task.owner();
      console.log('Contract Owner:', owner);
      console.log('');
      console.log('To change fees, contact the owner or use admin functions.');
    } catch (e) {
      console.log('(Could not query owner - may not have owner function)');
    }
    
  } catch (error) {
    console.error('Error querying fee info:', error.message);
    console.log('');
    console.log('The Primus TaskContract may not be deployed or may not have the expected interface.');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
