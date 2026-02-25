/**
 * Calculate Profitable Attestor Fees
 * 
 * Usage:
 *   node calculate-profitable-fee.js [gasPrice] [infraCost] [margin] [ethPrice]
 * 
 * Examples:
 *   node calculate-profitable-fee.js              # Default values
 *   node calculate-profitable-fee.js 0.001 0.03  # Gas: 0.001 gwei, Infra: $0.03
 *   node calculate-profitable-fee.js 0.1 0.05 1.0 3000  # Custom all params
 */

const { ethers } = require('ethers');

// Default values
const DEFAULT_GAS_PRICE_GWEI = 0.001;  // Base Sepolia typical
const DEFAULT_INFRA_COST_USD = 0.03;   // Conservative infrastructure cost
const DEFAULT_PROFIT_MARGIN = 0.5;     // 50% margin
const DEFAULT_ETH_PRICE_USD = 2500;

// Gas usage
const ATTESTOR_GAS = 250000;  // Gas for submitting attestation

function calculateProfitableFee(
  gasPriceGwei = DEFAULT_GAS_PRICE_GWEI,
  infraCostUsd = DEFAULT_INFRA_COST_USD,
  profitMargin = DEFAULT_PROFIT_MARGIN,
  ethPriceUsd = DEFAULT_ETH_PRICE_USD
) {
  // Calculate gas cost in USD
  const gasPrice = ethers.utils.parseUnits(gasPriceGwei.toString(), 'gwei');
  const gasCostWei = ethers.BigNumber.from(ATTESTOR_GAS).mul(gasPrice);
  const gasCostEth = parseFloat(ethers.utils.formatEther(gasCostWei));
  const gasCostUsd = gasCostEth * ethPriceUsd;
  
  // Total cost
  const totalCostUsd = gasCostUsd + infraCostUsd;
  
  // Break-even fee
  const breakEvenFeeUsd = totalCostUsd;
  const breakEvenFeeEth = breakEvenFeeUsd / ethPriceUsd;
  
  // Profitable fee (with margin)
  const profitableFeeUsd = totalCostUsd * (1 + profitMargin);
  const profitableFeeEth = profitableFeeUsd / ethPriceUsd;
  const profitableFeeWei = ethers.utils.parseEther(profitableFeeEth.toFixed(9));
  
  // Compare with current fee
  const currentFeeWei = ethers.BigNumber.from('10000000000'); // 10^10 wei
  const currentFeeEth = parseFloat(ethers.utils.formatEther(currentFeeWei));
  const currentFeeUsd = currentFeeEth * ethPriceUsd;
  
  // Calculate difference
  const feeIncreaseUsd = profitableFeeUsd - currentFeeUsd;
  const feeIncreaseMultiplier = profitableFeeWei.div(currentFeeWei).toNumber();
  
  // Profit analysis
  const currentProfitUsd = currentFeeUsd - totalCostUsd;
  const profitableProfitUsd = profitableFeeUsd - totalCostUsd;
  const profitableRoi = (profitableProfitUsd / totalCostUsd * 100).toFixed(0);
  
  return {
    costs: {
      gasUsd: gasCostUsd,
      infraUsd: infraCostUsd,
      totalUsd: totalCostUsd,
    },
    current: {
      feeUsd: currentFeeUsd,
      profitUsd: currentProfitUsd,
      status: currentProfitUsd >= 0 ? 'PROFITABLE' : 'LOSS',
    },
    breakEven: {
      feeUsd: breakEvenFeeUsd,
      feeEth: breakEvenFeeEth,
    },
    profitable: {
      margin: (profitMargin * 100).toFixed(0) + '%',
      feeUsd: profitableFeeUsd,
      feeEth: profitableFeeEth,
      feeWei: profitableFeeWei.toString(),
      profitUsd: profitableProfitUsd,
      roi: profitableRoi + '%',
    },
    comparison: {
      currentFeeUsd,
      neededFeeUsd: profitableFeeUsd,
      increaseUsd: feeIncreaseUsd,
      increaseMultiplier: feeIncreaseMultiplier + 'x',
    },
  };
}

function printResults(results) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║       PROFITABLE ATTESTOR FEE CALCULATOR                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log('Attestor Costs:');
  console.log(`  Gas Cost:        $${results.costs.gasUsd.toFixed(6)}`);
  console.log(`  Infra Cost:      $${results.costs.infraUsd.toFixed(6)}`);
  console.log(`  Total Cost:      $${results.costs.totalUsd.toFixed(6)}\n`);
  
  console.log('Current Fee Status:');
  console.log(`  Current Fee:     $${results.current.feeUsd.toFixed(6)}`);
  console.log(`  Profit/Loss:     $${results.current.profitUsd.toFixed(6)}`);
  console.log(`  Status:          ${results.current.status === 'PROFITABLE' ? '✅' : '❌'} ${results.current.status}\n`);
  
  console.log('Break-Even Fee:');
  console.log(`  Minimum Fee:     $${results.breakEven.feeUsd.toFixed(6)}`);
  console.log(`  In ETH:          ${results.breakEven.feeEth.toFixed(9)} ETH\n`);
  
  console.log(`Profitable Fee (${results.profitable.margin} margin):`);
  console.log(`  Fee USD:         $${results.profitable.feeUsd.toFixed(6)}`);
  console.log(`  Fee ETH:         ${results.profitable.feeEth.toFixed(9)} ETH`);
  console.log(`  Fee Wei:         ${results.profitable.feeWei}`);
  console.log(`  Profit:          $${results.profitable.profitUsd.toFixed(6)}`);
  console.log(`  ROI:             ${results.profitable.roi}\n`);
  
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`RECOMMENDATION: Set attestor fee to ${results.profitable.feeWei} wei`);
  console.log(`This is ${results.comparison.increaseMultiplier} higher than current fee.\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('To implement:');
  console.log('```solidity');
  console.log(`attestorFee = ${results.profitable.feeWei}; // ${results.profitable.feeEth.toFixed(9)} ETH`);
  console.log('```\n');
}

// Main execution
const args = process.argv.slice(2);
const gasPrice = parseFloat(args[0]) || DEFAULT_GAS_PRICE_GWEI;
const infraCost = parseFloat(args[1]) || DEFAULT_INFRA_COST_USD;
const margin = parseFloat(args[2]) || DEFAULT_PROFIT_MARGIN;
const ethPrice = parseFloat(args[3]) || DEFAULT_ETH_PRICE_USD;

console.log(`\nConfiguration:`);
console.log(`  Gas Price:   ${gasPrice} gwei`);
console.log(`  Infra Cost:  $${infraCost}`);
console.log(`  Margin:      ${(margin * 100).toFixed(0)}%`);
console.log(`  ETH Price:   $${ethPrice}`);

const results = calculateProfitableFee(gasPrice, infraCost, margin, ethPrice);
printResults(results);

// Export for use as module
module.exports = { calculateProfitableFee, ATTESTOR_GAS };
