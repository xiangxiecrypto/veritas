const hre = require("hardhat");

async function main() {
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  console.log('\n💰 Checking Primus Fee Structure\n');
  console.log('='.repeat(70));
  
  const [signer] = await hre.ethers.getSigners();
  
  const task = new hre.ethers.Contract(PRIMUS, [
    "function queryLatestFeeInfo(uint8 tokenSymbol) view returns (tuple(uint256 primusFee, uint256 attestorFee, uint64 settedAt))",
    "event FeeInfoUpdated(uint8 tokenSymbol, uint256 primusFee, uint256 attestorFee)"
  ], signer);
  
  // Get current fee
  const feeInfo = await task.queryLatestFeeInfo(0); // 0 = ETH
  console.log('Current Fee Info (ETH):');
  console.log('  primusFee:', feeInfo.primusFee.toString(), 'wei');
  console.log('           =', hre.ethers.utils.formatEther(feeInfo.primusFee), 'ETH');
  console.log('  attestorFee:', feeInfo.attestorFee.toString(), 'wei');
  console.log('             =', hre.ethers.utils.formatEther(feeInfo.attestorFee), 'ETH');
  console.log('  Total:', feeInfo.primusFee.add(feeInfo.attestorFee).toString(), 'wei');
  console.log('       =', hre.ethers.utils.formatEther(feeInfo.primusFee.add(feeInfo.attestorFee)), 'ETH');
  console.log('  settedAt:', new Date(feeInfo.settedAt * 1000).toISOString());
  console.log('');
  
  // Calculate if fee is enough for 1M gas
  const gasPrice = await hre.ethers.provider.getGasPrice();
  const callbackGas = 1000000; // 1M gas
  const requiredForCallback = gasPrice.mul(callbackGas);
  
  console.log('Gas Analysis:');
  console.log('─'.repeat(70));
  console.log('Current gas price:', hre.ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  console.log('Callback gas limit: 1,000,000');
  console.log('Required for callback:', hre.ethers.utils.formatEther(requiredForCallback), 'ETH');
  console.log('');
  console.log('Current fee:', hre.ethers.utils.formatEther(feeInfo.primusFee.add(feeInfo.attestorFee)), 'ETH');
  console.log('Required:', hre.ethers.utils.formatEther(requiredForCallback), 'ETH');
  console.log('');
  
  if (feeInfo.primusFee.add(feeInfo.attestorFee).gte(requiredForCallback)) {
    console.log('✅ Fee is SUFFICIENT for 1M gas callback');
  } else {
    console.log('❌ Fee is INSUFFICIENT');
    console.log('   Need to pay:', hre.ethers.utils.formatEther(requiredForCallback), 'ETH');
    console.log('   Currently paying:', hre.ethers.utils.formatEther(feeInfo.primusFee.add(feeInfo.attestorFee)), 'ETH');
    console.log('   Difference:', hre.ethers.utils.formatEther(requiredForCallback.sub(feeInfo.primusFee.add(feeInfo.attestorFee))), 'ETH');
  }
  console.log('');
  
  // Check recent FeeInfoUpdated events
  console.log('📋 Recent Fee Updates:');
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const events = await task.queryFilter(task.filters.FeeInfoUpdated(), currentBlock - 100);
  console.log('  FeeInfoUpdated events in last 100 blocks:', events.length);
  
  if (events.length > 0) {
    for (let i = events.length - 1; i >= Math.max(0, events.length - 3); i--) {
      const e = events[i];
      console.log(`  Block ${e.blockNumber}:`);
      console.log('    primusFee:', hre.ethers.utils.formatEther(e.args.primusFee), 'ETH');
      console.log('    attestorFee:', hre.ethers.utils.formatEther(e.args.attestorFee), 'ETH');
    }
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
