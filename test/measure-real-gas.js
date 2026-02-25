/**
 * @title Measure Gas Costs - Simple Contract Calls
 * @notice Tests actual gas costs for contract operations
 */

const hre = require("hardhat");
const { ethers } = hre;

// Contract ABIs
const APP_ABI = [
  "function requestValidation(uint256 agentId, uint256 ruleId, uint256[] checkIds, uint256 attestorCount) payable returns (bytes32)",
  "function ruleCount() view returns (uint256)"
];

const IDENTITY_ABI = [
  "function register() returns (uint256)",
  "function ownerOf(uint256) view returns (address)"
];

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         REAL GAS COST MEASUREMENT                                ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('Wallet:', wallet.address);
  
  const provider = wallet.provider;
  const gasPrice = await provider.getGasPrice();
  
  console.log('Gas Price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  console.log('ETH Price: $2500 (assumed)\n');
  
  // Contracts
  const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const PRIMUS_APP = "0xC34E7059e1E891a4c42F9232D0162dCab92Fa0ec";
  
  const identity = new ethers.Contract(IDENTITY_REGISTRY, IDENTITY_ABI, wallet);
  const app = new ethers.Contract(PRIMUS_APP, APP_ABI, wallet);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TEST 1: Agent Registration');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Register agent
  const regTx = await identity['register()']();
  console.log('Transaction submitted:', regTx.hash);
  
  const regReceipt = await regTx.wait();
  
  const regGasUsed = regReceipt.gasUsed;
  const regGasCost = regGasUsed.mul(regReceipt.effectiveGasPrice || gasPrice);
  const regCostEth = parseFloat(ethers.utils.formatEther(regGasCost));
  const regCostUsd = regCostEth * 2500;
  
  console.log('✅ Success!');
  console.log('Gas Used:', regGasUsed.toString());
  console.log('Gas Cost:', ethers.utils.formatEther(regGasCost), 'ETH');
  console.log('Cost USD: $', regCostUsd.toFixed(6));
  console.log('');
  
  // Extract agent ID from event
  const regEvent = regReceipt.events.find(e => e.event === 'Registered');
  const agentId = regEvent ? regEvent.args[0].toNumber() : 0;
  console.log('Agent ID:', agentId);
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TEST 2: Request Validation (simulated)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Note: This will fail because we don't have Primus configured, but we can measure gas for the attempt
  try {
    const fee = ethers.BigNumber.from('10000000000'); // 10^10 wei
    
    const valTx = await app.requestValidation(agentId, 0, [0], 1, { value: fee });
    console.log('Transaction submitted:', valTx.hash);
    
    const valReceipt = await valTx.wait();
    
    const valGasUsed = valReceipt.gasUsed;
    const valGasCost = valGasUsed.mul(valReceipt.effectiveGasPrice || gasPrice);
    const valCostEth = parseFloat(ethers.utils.formatEther(valGasCost));
    const valCostUsd = valCostEth * 2500;
    
    console.log('✅ Success!');
    console.log('Gas Used:', valGasUsed.toString());
    console.log('Gas Cost:', ethers.utils.formatEther(valGasCost), 'ETH');
    console.log('Cost USD: $', valCostUsd.toFixed(6));
    console.log('');
    
    // Check for events
    console.log('Events:');
    valReceipt.events.forEach(e => {
      console.log('  -', e.event, e.args.map(a => a?.toString?.() || a));
    });
    console.log('');
    
  } catch (error) {
    console.log('❌ Failed:', error.message);
    console.log('This is expected (Primus not configured)');
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('Registration:');
  console.log('  Gas:', regGasUsed.toString());
  console.log('  Cost: $', regCostUsd.toFixed(6));
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ MEASUREMENT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
