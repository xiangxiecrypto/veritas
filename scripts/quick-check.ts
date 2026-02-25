/**
 * @fileoverview Quick status check
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('\n=== Quick Status Check ===\n');

  try {
    // Check account
    const [signer] = await ethers.getSigners();
    console.log('✅ Account:', signer.address);
    
    // Check balance
    const balance = await ethers.provider.getBalance(signer.address);
    console.log('✅ Balance:', ethers.formatEther(balance), 'ETH');
    
    // Check network
    const network = await ethers.provider.getNetwork();
    console.log('✅ Network:', network.name, `(${network.chainId})`);
    
    // Check Primus config
    const appId = process.env.PRIMUS_APP_ID;
    const appSecret = process.env.PRIMUS_APP_SECRET;
    
    console.log('\n=== Primus Configuration ===');
    console.log('✅ APP ID:', appId ? `${appId.substring(0, 10)}...` : 'NOT SET');
    console.log('✅ SECRET:', appSecret ? `${appSecret.substring(0, 10)}...` : 'NOT SET');
    
    if (balance > ethers.parseEther('0.001')) {
      console.log('\n✅ Ready to deploy and test!');
    } else {
      console.log('\n⚠️  Need more ETH for testing');
    }
    
  } catch (error: any) {
    console.log('\n❌ Error:', error.message);
  }
}

main();
