/**
 * @fileoverview Check environment and account balance
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('========================================');
  console.log('  Environment Check');
  console.log('  ========================================\n');

  try {
    const [signer] = await ethers.getSigners();
    
    console.log('Account Information:');
    console.log('  Address:', signer.address);
    
    const balance = await ethers.provider.getBalance(signer.address);
    console.log('  Balance:', ethers.formatEther(balance), 'ETH');
    
    const network = await ethers.provider.getNetwork();
    console.log('  Network:', network.name);
    console.log('  Chain ID:', network.chainId);
    
    console.log('\nEnvironment Variables:');
    console.log('  BASE_SEPOLIA_RPC:', process.env.BASE_SEPOLIA_RPC ? '✅ Set' : '❌ Not set');
    console.log('  PRIVATE_KEY:', process.env.PRIVATE_KEY ? '✅ Set' : '❌ Not set');
    console.log('  PRIMUS_APP_ID:', process.env.PRIMUS_APP_ID ? '✅ Set' : '❌ Not set');
    console.log('  PRIMUS_APP_SECRET:', process.env.PRIMUS_APP_SECRET ? '✅ Set' : '❌ Not set');
    
    if (balance < ethers.parseEther('0.001')) {
      console.log('\n⚠️  Warning: Balance too low. Need at least 0.01 ETH for testing.');
      console.log('Get Base Sepolia ETH from:');
      console.log('  - https://faucet.triangleplatform.com/base-sepolia/');
      console.log('  - https://faucet.base.org/');
    } else {
      console.log('\n✅ Account has sufficient balance for testing');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
