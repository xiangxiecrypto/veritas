const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const FOLLOWER_CHECK = "0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n📋 Setting Up Rules\n');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await hre.ethers.provider.getGasPrice();
  
  // Rule 0: Moltbook X Followers
  console.log('Adding Rule 0...');
  const ruleTx = await app.addRule(
    "https://www.moltbook.com/api/v1/agents/profile?name=*",
    "followers",
    "$.agent.owner.x_follower_count",
    0,
    3600,
    "Moltbook X Followers Check",
    { gasPrice: gasPrice.mul(3) }
  );
  await ruleTx.wait();
  console.log('✅ Rule 0 added');
  
  // Check 0: 500+ followers = 98 score
  console.log('Adding Check 0...');
  const checkParams = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'uint256'],
    [500, 1000000]
  );
  
  const checkTx = await app.addCheck(0, FOLLOWER_CHECK, checkParams, 98, {
    gasPrice: gasPrice.mul(3)
  });
  await checkTx.wait();
  console.log('✅ Check 0 added');
  
  console.log('\n✅ Setup Complete!');
}

main().catch(console.error);
