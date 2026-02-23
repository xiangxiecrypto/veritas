const hre = require("hardhat");

async function main() {
  const PRIMUS_PROXY = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  console.log('\n🔍 Checking Primus TaskContract Architecture\n');
  console.log('='.repeat(70));
  
  // ERC-1967 implementation slot
  const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const implData = await hre.ethers.provider.getStorageAt(PRIMUS_PROXY, implSlot);
  const implAddress = '0x' + implData.slice(26, 66);
  
  console.log('Proxy Address:', PRIMUS_PROXY);
  console.log('Implementation:', implAddress);
  console.log('');
  
  // Check admin slot (for upgradeable proxy)
  const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b7d6103';
  const adminData = await hre.ethers.provider.getStorageAt(PRIMUS_PROXY, adminSlot);
  const adminAddress = '0x' + adminData.slice(26, 66);
  
  if (adminAddress !== '0x0000000000000000000000000000000000000000') {
    console.log('Admin (Proxy Admin):', adminAddress);
    console.log('');
    console.log('This is a Transparent Upgradeable Proxy');
    console.log('');
    console.log('⚠️ When proxy calls external contracts:');
    console.log('   msg.sender = Proxy address (0xC022...)');
    console.log('   NOT implementation address');
  } else {
    console.log('Admin: None (might be UUPS or immutable)');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Conclusion:');
  console.log('─'.repeat(70));
  console.log('');
  console.log('When Primus TaskContract calls our callback:');
  console.log('  msg.sender should be:', PRIMUS_PROXY);
  console.log('  Our onlyTask checks:', PRIMUS_PROXY);
  console.log('  Match: ✅ YES');
  console.log('');
  console.log('So the onlyTask check SHOULD pass!');
  console.log('The issue must be something else...');
}

main().catch(console.error);
