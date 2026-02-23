const hre = require("hardhat");

async function main() {
  const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
  const FOLLOWER_CHECK = "0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n📋 Setting Up Rules on New Contract\n');
  console.log('='.repeat(70));
  console.log('App:', APP);
  console.log('');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Rule 0: Moltbook X Followers
  console.log('📦 Adding Rule 0: Moltbook X Followers');
  const ruleTx = await app.addRule(
    "https://www.moltbook.com/api/v1/agents/profile?name=*",
    "followers",
    "$.agent.owner.x_follower_count",
    0,
    3600,
    "Moltbook X Followers Check"
  );
  await ruleTx.wait();
  console.log('✅ Rule 0 added!');
  
  // Check 0: 500+ followers = 98 score
  console.log('📦 Adding Check 0: 500+ followers = 98 score');
  const checkParams = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'uint256'],
    [500, 1000000]
  );
  
  const checkTx = await app.addCheck(0, FOLLOWER_CHECK, checkParams, 98);
  await checkTx.wait();
  console.log('✅ Check 0 added!');
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Setup Complete!');
  console.log('\nReady to test with Agent ID 1018!');
  console.log('Use: submitAttestation(taskId) after SDK attestation');
}

main().catch(console.error);
