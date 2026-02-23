const hre = require("hardhat");

async function main() {
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  console.log('\n🔍 Checking Primus Callback Gas Settings\n');
  console.log('='.repeat(70));
  
  const [signer] = await hre.ethers.getSigners();
  
  // Try to find callback gas related functions
  const code = await hre.ethers.provider.getCode(PRIMUS);
  
  // Look for common function selectors
  const selectors = {
    'callbackGasLimit': hre.ethers.utils.id('callbackGasLimit()').slice(0, 10),
    'getCallbackGas': hre.ethers.utils.id('getCallbackGas()').slice(0, 10),
    'CALLBACK_GAS': hre.ethers.utils.id('CALLBACK_GAS()').slice(0, 10),
  };
  
  console.log('Checking for callback gas functions in bytecode:');
  for (const [name, selector] of Object.entries(selectors)) {
    const exists = code.includes(selector.slice(2));
    console.log(`  ${name}: ${exists ? '✅ Found' : '❌ Not found'} (${selector})`);
  }
  
  // Check latest fee
  const task = new hre.ethers.Contract(PRIMUS, [
    "function queryLatestFeeInfo(uint8) view returns (tuple(uint256 primusFee, uint256 attestorFee, uint64 settedAt))"
  ], signer);
  
  const feeInfo = await task.queryLatestFeeInfo(0);
  console.log('\nFee Info:');
  console.log('  primusFee:', feeInfo.primusFee.toString(), 'wei');
  console.log('  attestorFee:', feeInfo.attestorFee.toString(), 'wei');
  console.log('  settedAt:', new Date(feeInfo.settedAt * 1000).toISOString());
  console.log('');
  
  // Calculate what fee would be needed for 285k gas
  const gasPrice = await hre.ethers.provider.getGasPrice();
  const totalGas = 285767;
  const needed = gasPrice.mul(totalGas);
  
  console.log('Gas Calculation:');
  console.log('  Gas price:', hre.ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  console.log('  Total gas (sum):', totalGas);
  console.log('  Fee needed:', hre.ethers.utils.formatEther(needed), 'ETH');
  console.log('  Current fee:', hre.ethers.utils.formatEther(feeInfo.primusFee.add(feeInfo.attestorFee)), 'ETH');
  
  if (needed.gt(feeInfo.primusFee.add(feeInfo.attestorFee))) {
    console.log('  ❌ Need', hre.ethers.utils.formatEther(needed.sub(feeInfo.primusFee.add(feeInfo.attestorFee))), 'ETH more');
  } else {
    console.log('  ✅ Current fee is sufficient');
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
