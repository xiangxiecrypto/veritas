const hre = require("hardhat");

async function main() {
  const APP = "0xcC0EB7ed46Ebcfbe5Ffee93c1467988eD668526a";
  const FOLLOWER_CHECK = "0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n📋 Adding Check 0\n');
  console.log('='.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Check 0: 500+ followers = 98 score
  console.log('📦 Adding Check 0: 500+ followers = 98 score');
  console.log('─'.repeat(70));
  
  const checkParams = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'uint256'],
    [500, 1000000]  // minFollowers=500, maxFollowers=1M
  );
  
  const checkTx = await app.addCheck(
    0,                  // ruleId
    FOLLOWER_CHECK,     // checkContract
    checkParams,        // params
    98                  // score
  );
  
  console.log('Tx sent:', checkTx.hash);
  const checkReceipt = await checkTx.wait();
  console.log('✅ Check 0 added! Block:', checkReceipt.blockNumber);
  console.log('');
  
  // Verify
  const check = await app.checks(0, 0);
  console.log('Check 0:');
  console.log('  Contract:', check.checkContract);
  console.log('  Score:', check.score.toString());
  console.log('  Active:', check.active);
  console.log('');
  
  console.log('✅ Setup Complete!');
}

main().catch(console.error);
