const hre = require("hardhat");

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const FOLLOWER_CHECK = "0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n📋 Setting Up Validation Rules\n');
  console.log('='.repeat(70));
  console.log('App:', APP);
  console.log('FollowerCheck:', FOLLOWER_CHECK);
  console.log('');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Rule 0: Moltbook X Followers
  console.log('📦 Adding Rule 0: Moltbook X Followers');
  console.log('─'.repeat(70));
  
  const ruleTx = await app.addRule(
    "https://www.moltbook.com/api/v1/agents/profile?name=*",  // URL template with * placeholder
    "followers",                                              // dataKey
    "$.data.followers",                                       // parsePath
    0,                                                        // decimals
    3600,                                                     // maxAge (1 hour)
    "Moltbook X Followers Check"                              // description
  );
  
  console.log('Tx sent:', ruleTx.hash);
  const ruleReceipt = await ruleTx.wait();
  console.log('✅ Rule 0 added! Block:', ruleReceipt.blockNumber);
  console.log('');
  
  // Check 0: 500+ followers = 98 score
  console.log('📦 Adding Check 0: 500+ followers = 98 score');
  console.log('─'.repeat(70));
  
  // Encode params for FollowerThresholdCheck: (minFollowers, maxFollowers)
  const checkParams = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'uint256'],
    [500, 1000000]  // 500 to 1M followers
  );
  
  const checkTx = await app.addCheck(
    0,                      // ruleId
    FOLLOWER_CHECK,         // checkContract
    checkParams,            // params
    98                      // score
  );
  
  console.log('Tx sent:', checkTx.hash);
  const checkReceipt = await checkTx.wait();
  console.log('✅ Check 0 added! Block:', checkReceipt.blockNumber);
  console.log('');
  
  // Verify setup
  console.log('🔍 Verifying Setup');
  console.log('─'.repeat(70));
  
  const rule = await app.rules(0);
  console.log('Rule 0:');
  console.log('  URL:', rule.url);
  console.log('  Data Key:', rule.dataKey);
  console.log('  Parse Path:', rule.parsePath);
  console.log('  Active:', rule.active);
  console.log('');
  
  const check = await app.checks(0, 0);
  console.log('Check 0:');
  console.log('  Contract:', check.checkContract);
  console.log('  Score:', check.score.toString());
  console.log('  Active:', check.active);
  console.log('');
  
  console.log('='.repeat(70));
  console.log('✅ Setup Complete!\n');
  console.log('Configuration:');
  console.log('  Rule 0: Moltbook X Followers (template URL)');
  console.log('  Check 0: 500+ followers = 98 score');
  console.log('');
  console.log('Ready to test with agent ID 1018!');
}

main().catch(console.error);
