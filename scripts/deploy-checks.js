const hre = require("hardhat");

const APP = "0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e";

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log('Deployer:', wallet.address);
  
  // Deploy SimpleVerificationCheck
  console.log('\n📦 Deploying SimpleVerificationCheck...');
  const SimpleCheck = await hre.ethers.getContractFactory("SimpleVerificationCheck");
  const simpleCheck = await SimpleCheck.deploy();
  await simpleCheck.deployed();
  console.log('✅ SimpleVerificationCheck:', simpleCheck.address);
  
  // Deploy FollowerThresholdCheck
  console.log('\n📦 Deploying FollowerThresholdCheck...');
  const FollowerCheck = await hre.ethers.getContractFactory("FollowerThresholdCheck");
  const followerCheck = await FollowerCheck.deploy();
  await followerCheck.deployed();
  console.log('✅ FollowerThresholdCheck:', followerCheck.address);
  
  // Get gas price
  const gasPrice = await ethers.provider.getGasPrice();
  
  // Attach to app
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Add BTC Price Rule
  console.log('\n📦 Adding BTC Price Rule...');
  const btcTx = await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "btcPrice",
    "$.data.rates.USD",
    0,
    3600,
    "Coinbase BTC/USD Price",
    { gasPrice: gasPrice.mul(3), gasLimit: 500000 }
  );
  await btcTx.wait();
  
  const btcRuleId = (await app.ruleCount()).toNumber() - 1;
  console.log('✅ BTC Rule added, ID:', btcRuleId);
  console.log('   Tx:', btcTx.hash);
  
  // Add BTC Check
  console.log('\n📦 Adding BTC Check...');
  const btcCheckTx = await app.addCheck(btcRuleId, simpleCheck.address, "0x", 100, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await btcCheckTx.wait();
  console.log('✅ BTC Check added');
  console.log('   Tx:', btcCheckTx.hash);
  
  // Add Moltbook X Followers Rule
  console.log('\n📦 Adding Moltbook X Followers Rule...');
  const moltbookTx = await app.addRule(
    "https://www.moltbook.com/api/v1/agents/profile?name=*",
    "x_followers",
    "$.agent.owner.x_follower_count",
    0,
    3600,
    "Moltbook X Followers",
    { gasPrice: gasPrice.mul(3), gasLimit: 500000 }
  );
  await moltbookTx.wait();
  
  const moltbookRuleId = (await app.ruleCount()).toNumber() - 1;
  console.log('✅ Moltbook Rule added, ID:', moltbookRuleId);
  console.log('   Tx:', moltbookTx.hash);
  
  // Add Moltbook Check
  console.log('\n📦 Adding Moltbook Check...');
  const moltbookCheckTx = await app.addCheck(moltbookRuleId, followerCheck.address, "0x", 100, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await moltbookCheckTx.wait();
  console.log('✅ Moltbook Check added');
  console.log('   Tx:', moltbookCheckTx.hash);
  
  console.log('\n=== SUMMARY ===');
  console.log('SimpleVerificationCheck:', simpleCheck.address);
  console.log('FollowerThresholdCheck:', followerCheck.address);
  console.log('BTC Rule ID:', btcRuleId);
  console.log('Moltbook Rule ID:', moltbookRuleId);
}

main().catch(console.error);
