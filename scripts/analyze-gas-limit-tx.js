const hre = require("hardhat");

async function main() {
  const GAS_LIMIT_TX = "0x3b20bd946eefab6e101e6115ede2fc79cefe6ab4bab9a97d44b3ac77f5a22fb5";
  const PRIMUS_PROXY = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  console.log('\n🔍 Analyzing Gas Limit Transaction\n');
  console.log('='.repeat(70));
  
  const tx = await hre.ethers.provider.getTransaction(GAS_LIMIT_TX);
  
  console.log('Transaction Details:');
  console.log('  Hash:', GAS_LIMIT_TX);
  console.log('  From:', tx.from);
  console.log('  To:', tx.to);
  console.log('  Data:', tx.data);
  console.log('');
  
  if (tx.data && tx.data !== '0x') {
    const selector = tx.data.slice(0, 10);
    console.log('Function Selector:', selector);
    
    // Check if this is a proxy upgrade
    const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
    const implBefore = await hre.ethers.provider.getStorageAt(PRIMUS_PROXY, implSlot, tx.blockNumber - 1);
    const implAfter = await hre.ethers.provider.getStorageAt(PRIMUS_PROXY, implSlot, tx.blockNumber);
    
    const implBeforeAddr = '0x' + implBefore.slice(26, 66);
    const implAfterAddr = '0x' + implAfter.slice(26, 66);
    
    console.log('');
    console.log('Implementation Address Check:');
    console.log('  Before:', implBeforeAddr);
    console.log('  After:', implAfterAddr);
    console.log('  Changed:', implBeforeAddr !== implAfterAddr ? '✅ YES' : '❌ NO');
    
    // Try to decode the function call
    console.log('');
    console.log('Possible Function Signatures:');
    const candidates = [
      'setCallbackGasLimit(uint256)',
      'setGasLimit(uint256)', 
      'setCallbackGas(uint256)',
      'updateCallbackGas(uint256)',
      'upgradeTo(address)',
      'upgradeToAndCall(address,bytes)'
    ];
    
    for (const sig of candidates) {
      const hash = hre.ethers.utils.id(sig).slice(0, 10);
      const match = hash === selector ? '✅ MATCH' : '';
      console.log(`  ${sig.padEnd(35)} ${hash} ${match}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
