/**
 * Gas Cost Calculator for Veritas Protocol
 * 
 * Usage:
 *   node calculate-gas-costs.js [validations] [gasPrice] [ethPrice]
 * 
 * Examples:
 *   node calculate-gas-costs.js 1          # 1 validation, Base Sepolia defaults
 *   node calculate-gas-costs.js 10 0.01   # 10 validations, 0.01 gwei
 *   node calculate-gas-costs.js 100 0.1 3000  # 100 validations, 0.1 gwei, $3000 ETH
 */

const { ethers } = require('ethers');

// Default values
const DEFAULT_GAS_PRICE_GWEI = 0.001;  // Base Sepolia typical
const DEFAULT_ETH_PRICE_USD = 2500;

// Gas costs (from actual measurements)
const GAS_COSTS = {
  agentRegistration: 85000,
  requestValidation: 120000,
  submitAttestation: 250000,  // Per check
  perAdditionalCheck: 50000,
};

// Attestation fee (fixed by Primus)
const ATTESTATION_FEE_ETH = '0.00000001';  // 10^10 wei

function calculateGasCosts(
  numValidations = 1,
  numChecksPerValidation = 1,
  gasPriceGwei = DEFAULT_GAS_PRICE_GWEI,
  ethPriceUsd = DEFAULT_ETH_PRICE_USD
) {
  const gasPrice = ethers.utils.parseUnits(gasPriceGwei.toString(), 'gwei');
  const attestationFee = ethers.utils.parseEther(ATTESTATION_FEE_ETH);
  
  // Calculate gas costs in wei
  const registrationGasWei = ethers.BigNumber.from(GAS_COSTS.agentRegistration).mul(gasPrice);
  const requestGasWei = ethers.BigNumber.from(GAS_COSTS.requestValidation).mul(gasPrice);
  const submitGasWei = ethers.BigNumber.from(
    GAS_COSTS.submitAttestation + 
    (numChecksPerValidation - 1) * GAS_COSTS.perAdditionalCheck
  ).mul(gasPrice);
  
  // Total costs in ETH
  const userGasEth = ethers.utils.formatEther(
    registrationGasWei.add(requestGasWei.mul(numValidations))
  );
  const attestorGasEth = ethers.utils.formatEther(
    submitGasWei.mul(numValidations)
  );
  const attestationFeesEth = (
    parseFloat(ethers.utils.formatEther(attestationFee)) * numValidations
  ).toFixed(9);
  
  // Total in USD
  const userCostUsd = parseFloat(userGasEth) * ethPriceUsd + 
                      parseFloat(attestationFeesEth) * ethPriceUsd;
  const attestorCostUsd = parseFloat(attestorGasEth) * ethPriceUsd;
  const totalCostUsd = userCostUsd + attestorCostUsd;
  
  return {
    validations: numValidations,
    checksPerValidation: numChecksPerValidation,
    gasPriceGwei,
    ethPriceUsd,
    user: {
      gasEth: userGasEth,
      attestationFeesEth,
      totalEth: (parseFloat(userGasEth) + parseFloat(attestationFeesEth)).toFixed(9),
      totalUsd: userCostUsd.toFixed(6),
    },
    attestor: {
      gasEth: attestorGasEth,
      totalUsd: attestorCostUsd.toFixed(6),
    },
    total: {
      gasEth: (parseFloat(userGasEth) + parseFloat(attestorGasEth)).toFixed(9),
      totalEth: (
        parseFloat(userGasEth) + 
        parseFloat(attestorGasEth) + 
        parseFloat(attestationFeesEth)
      ).toFixed(9),
      totalUsd: totalCostUsd.toFixed(6),
    },
  };
}

function printResults(results) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          VERITAS PROTOCOL GAS COST CALCULATOR               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log('Configuration:');
  console.log(`  Validations:      ${results.validations}`);
  console.log(`  Checks each:      ${results.checksPerValidation}`);
  console.log(`  Gas Price:        ${results.gasPriceGwei} gwei`);
  console.log(`  ETH Price:        $${results.ethPriceUsd}\n`);
  
  console.log('User Costs:');
  console.log(`  Gas Used:         ${results.user.gasEth} ETH`);
  console.log(`  Attestation Fees: ${results.user.attestationFeesEth} ETH`);
  console.log(`  Total:            ${results.user.totalEth} ETH ($${results.user.totalUsd})\n`);
  
  console.log('Attestor Costs:');
  console.log(`  Gas Used:         ${results.attestor.gasEth} ETH`);
  console.log(`  Total:            $${results.attestor.totalUsd}\n`);
  
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`TOTAL COST: ${results.total.totalEth} ETH ($${results.total.totalUsd})\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Main execution
const args = process.argv.slice(2);
const numValidations = parseInt(args[0]) || 1;
const gasPriceGwei = parseFloat(args[1]) || DEFAULT_GAS_PRICE_GWEI;
const ethPriceUsd = parseFloat(args[2]) || DEFAULT_ETH_PRICE_USD;

const results = calculateGasCosts(numValidations, 1, gasPriceGwei, ethPriceUsd);
printResults(results);

// Export for use as module
module.exports = { calculateGasCosts, GAS_COSTS, ATTESTATION_FEE_ETH };
