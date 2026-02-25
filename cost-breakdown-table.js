/**
 * Real Cost Breakdown - Gas vs Infrastructure
 */

const { ethers } = require('ethers');

// Real test results
const REAL_GAS_MEASUREMENTS = {
  agentRegistration: 89783,
  requestValidation: 100000,  // Estimated (couldn't test due to error)
  callbackAttestation: 160000, // Estimated (1 check)
  callbackAttestation3Checks: 260000, // Estimated (3 checks)
};

const GAS_PRICES = {
  baseSepolia: 0.006,  // gwei (actual test)
  baseMainnet: 0.3,    // gwei (conservative estimate)
  ethPrice: 2500,      // USD
};

const INFRASTRUCTURE_COSTS = {
  low: 0.02,   // USD
  mid: 0.035,  // USD
  high: 0.05,  // USD
};

function calculateGasCost(gas, gasPriceGwei) {
  const gasPrice = ethers.utils.parseUnits(gasPriceGwei.toString(), 'gwei');
  const costWei = ethers.BigNumber.from(gas).mul(gasPrice);
  const costEth = parseFloat(ethers.utils.formatEther(costWei));
  return costEth;
}

function formatTable(title, data) {
  console.log('\n' + '═'.repeat(70));
  console.log(title);
  console.log('═'.repeat(70) + '\n');
  
  data.forEach(row => {
    if (row.length === 1) {
      console.log(row[0]);
    } else {
      console.log(row.map((cell, i) => {
        const width = [30, 15, 15, 15][i] || 15;
        return String(cell).padEnd(width);
      }).join(''));
    }
  });
}

function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     REAL COST BREAKDOWN - GAS vs INFRASTRUCTURE               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // ==================== BASE SEPOLIA (TESTNET) ====================
  
  formatTable('BASE SEPOLIA (TESTNET)', [
    ['Component', 'Gas', 'Cost ETH', 'Cost USD'],
    ['─'.repeat(70)],
    ['USER COSTS', '', '', ''],
    ['Agent Registration', REAL_GAS_MEASUREMENTS.agentRegistration.toLocaleString(), 
     calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration, GAS_PRICES.baseSepolia).toFixed(9),
     '$' + (calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice).toFixed(6)],
    ['Request Validation', REAL_GAS_MEASUREMENTS.requestValidation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.requestValidation, GAS_PRICES.baseSepolia).toFixed(9),
     '$' + (calculateGasCost(REAL_GAS_MEASUREMENTS.requestValidation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice).toFixed(6)],
    ['Attestation Fee', '-',
     '0.000000010',
     '$0.000025'],
    ['USER SUBTOTAL', 
     (REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation).toLocaleString(),
     (calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation, GAS_PRICES.baseSepolia) + 0.00000001).toFixed(9),
     '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice) + 0.000025).toFixed(6)],
    ['─'.repeat(70)],
    ['ATTESTOR COSTS', '', '', ''],
    ['Gas (Callback 1 check)', REAL_GAS_MEASUREMENTS.callbackAttestation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia).toFixed(9),
     '$' + (calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice).toFixed(6)],
    ['Infrastructure (LOW)', '-',
     '-',
     '$' + INFRASTRUCTURE_COSTS.low.toFixed(2)],
    ['Infrastructure (MID)', '-',
     '-',
     '$' + INFRASTRUCTURE_COSTS.mid.toFixed(2)],
    ['Infrastructure (HIGH)', '-',
     '-',
     '$' + INFRASTRUCTURE_COSTS.high.toFixed(2)],
    ['ATTESTOR SUBTOTAL (LOW)', 
     REAL_GAS_MEASUREMENTS.callbackAttestation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia).toFixed(9),
     '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice) + INFRASTRUCTURE_COSTS.low).toFixed(4)],
    ['ATTESTOR SUBTOTAL (MID)', 
     REAL_GAS_MEASUREMENTS.callbackAttestation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia).toFixed(9),
     '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice) + INFRASTRUCTURE_COSTS.mid).toFixed(4)],
    ['ATTESTOR SUBTOTAL (HIGH)', 
     REAL_GAS_MEASUREMENTS.callbackAttestation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia).toFixed(9),
     '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice) + INFRASTRUCTURE_COSTS.high).toFixed(4)],
    ['─'.repeat(70)],
    ['TOTAL (LOW)', '-', '-', '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation + REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice) + 0.000025 + INFRASTRUCTURE_COSTS.low).toFixed(4)],
    ['TOTAL (MID)', '-', '-', '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation + REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice) + 0.000025 + INFRASTRUCTURE_COSTS.mid).toFixed(4)],
    ['TOTAL (HIGH)', '-', '-', '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation + REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice) + 0.000025 + INFRASTRUCTURE_COSTS.high).toFixed(4)],
  ]);

  // ==================== BASE MAINNET ====================
  
  formatTable('BASE MAINNET (PRODUCTION)', [
    ['Component', 'Gas', 'Cost ETH', 'Cost USD'],
    ['─'.repeat(70)],
    ['USER COSTS', '', '', ''],
    ['Agent Registration', REAL_GAS_MEASUREMENTS.agentRegistration.toLocaleString(), 
     calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration, GAS_PRICES.baseMainnet).toFixed(9),
     '$' + (calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice).toFixed(6)],
    ['Request Validation', REAL_GAS_MEASUREMENTS.requestValidation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.requestValidation, GAS_PRICES.baseMainnet).toFixed(9),
     '$' + (calculateGasCost(REAL_GAS_MEASUREMENTS.requestValidation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice).toFixed(6)],
    ['Attestation Fee', '-',
     '0.000000010',
     '$0.000025'],
    ['USER SUBTOTAL', 
     (REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation).toLocaleString(),
     (calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation, GAS_PRICES.baseMainnet) + 0.00000001).toFixed(9),
     '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice) + 0.000025).toFixed(4)],
    ['─'.repeat(70)],
    ['ATTESTOR COSTS', '', '', ''],
    ['Gas (Callback 1 check)', REAL_GAS_MEASUREMENTS.callbackAttestation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet).toFixed(9),
     '$' + (calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice).toFixed(4)],
    ['Infrastructure (LOW)', '-',
     '-',
     '$' + INFRASTRUCTURE_COSTS.low.toFixed(2)],
    ['Infrastructure (MID)', '-',
     '-',
     '$' + INFRASTRUCTURE_COSTS.mid.toFixed(2)],
    ['Infrastructure (HIGH)', '-',
     '-',
     '$' + INFRASTRUCTURE_COSTS.high.toFixed(2)],
    ['ATTESTOR SUBTOTAL (LOW)', 
     REAL_GAS_MEASUREMENTS.callbackAttestation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet).toFixed(9),
     '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice) + INFRASTRUCTURE_COSTS.low).toFixed(4)],
    ['ATTESTOR SUBTOTAL (MID)', 
     REAL_GAS_MEASUREMENTS.callbackAttestation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet).toFixed(9),
     '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice) + INFRASTRUCTURE_COSTS.mid).toFixed(4)],
    ['ATTESTOR SUBTOTAL (HIGH)', 
     REAL_GAS_MEASUREMENTS.callbackAttestation.toLocaleString(),
     calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet).toFixed(9),
     '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice) + INFRASTRUCTURE_COSTS.high).toFixed(4)],
    ['─'.repeat(70)],
    ['TOTAL (LOW)', '-', '-', '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation + REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice) + 0.000025 + INFRASTRUCTURE_COSTS.low).toFixed(4)],
    ['TOTAL (MID)', '-', '-', '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation + REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice) + 0.000025 + INFRASTRUCTURE_COSTS.mid).toFixed(4)],
    ['TOTAL (HIGH)', '-', '-', '$' + ((calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation + REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice) + 0.000025 + INFRASTRUCTURE_COSTS.high).toFixed(4)],
  ]);

  // ==================== COST COMPARISON ====================
  
  const testnetGas = calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation + REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseSepolia) * GAS_PRICES.ethPrice;
  const mainnetGas = calculateGasCost(REAL_GAS_MEASUREMENTS.agentRegistration + REAL_GAS_MEASUREMENTS.requestValidation + REAL_GAS_MEASUREMENTS.callbackAttestation, GAS_PRICES.baseMainnet) * GAS_PRICES.ethPrice;
  
  formatTable('COST BREAKDOWN BY TYPE', [
    ['Network', 'Gas Cost', 'Infra Cost', 'Total', 'Gas %', 'Infra %'],
    ['─'.repeat(70)],
    ['Base Sepolia (LOW)', '$' + testnetGas.toFixed(6), '$' + INFRASTRUCTURE_COSTS.low.toFixed(2), '$' + (testnetGas + INFRASTRUCTURE_COSTS.low).toFixed(4), ((testnetGas / (testnetGas + INFRASTRUCTURE_COSTS.low)) * 100).toFixed(0) + '%', ((INFRASTRUCTURE_COSTS.low / (testnetGas + INFRASTRUCTURE_COSTS.low)) * 100).toFixed(0) + '%'],
    ['Base Sepolia (MID)', '$' + testnetGas.toFixed(6), '$' + INFRASTRUCTURE_COSTS.mid.toFixed(2), '$' + (testnetGas + INFRASTRUCTURE_COSTS.mid).toFixed(4), ((testnetGas / (testnetGas + INFRASTRUCTURE_COSTS.mid)) * 100).toFixed(0) + '%', ((INFRASTRUCTURE_COSTS.mid / (testnetGas + INFRASTRUCTURE_COSTS.mid)) * 100).toFixed(0) + '%'],
    ['Base Sepolia (HIGH)', '$' + testnetGas.toFixed(6), '$' + INFRASTRUCTURE_COSTS.high.toFixed(2), '$' + (testnetGas + INFRASTRUCTURE_COSTS.high).toFixed(4), ((testnetGas / (testnetGas + INFRASTRUCTURE_COSTS.high)) * 100).toFixed(0) + '%', ((INFRASTRUCTURE_COSTS.high / (testnetGas + INFRASTRUCTURE_COSTS.high)) * 100).toFixed(0) + '%'],
    ['Base Mainnet (LOW)', '$' + mainnetGas.toFixed(6), '$' + INFRASTRUCTURE_COSTS.low.toFixed(2), '$' + (mainnetGas + INFRASTRUCTURE_COSTS.low).toFixed(4), ((mainnetGas / (mainnetGas + INFRASTRUCTURE_COSTS.low)) * 100).toFixed(0) + '%', ((INFRASTRUCTURE_COSTS.low / (mainnetGas + INFRASTRUCTURE_COSTS.low)) * 100).toFixed(0) + '%'],
    ['Base Mainnet (MID)', '$' + mainnetGas.toFixed(6), '$' + INFRASTRUCTURE_COSTS.mid.toFixed(2), '$' + (mainnetGas + INFRASTRUCTURE_COSTS.mid).toFixed(4), ((mainnetGas / (mainnetGas + INFRASTRUCTURE_COSTS.mid)) * 100).toFixed(0) + '%', ((INFRASTRUCTURE_COSTS.mid / (mainnetGas + INFRASTRUCTURE_COSTS.mid)) * 100).toFixed(0) + '%'],
    ['Base Mainnet (HIGH)', '$' + mainnetGas.toFixed(6), '$' + INFRASTRUCTURE_COSTS.high.toFixed(2), '$' + (mainnetGas + INFRASTRUCTURE_COSTS.high).toFixed(4), ((mainnetGas / (mainnetGas + INFRASTRUCTURE_COSTS.high)) * 100).toFixed(0) + '%', ((INFRASTRUCTURE_COSTS.high / (mainnetGas + INFRASTRUCTURE_COSTS.high)) * 100).toFixed(0) + '%'],
  ]);

  console.log('\n═'.repeat(70) + '\n');
}

main();
