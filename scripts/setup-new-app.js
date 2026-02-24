const hre = require("hardhat");

const APP = "0x27EbbE4ddFBef4563570DB0FF60Bb16635568f1E";

async function main() {
  const [wallet] = await ethers.getSigners();
  const gasPrice = await ethers.provider.getGasPrice();
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('SETTING UP PrimusVeritasApp');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // ========================================
  // STEP 1: Deploy SimpleVerificationCheck
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY SimpleVerificationCheck');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const SimpleCheck = await hre.ethers.getContractFactory("SimpleVerificationCheck");
  const simpleCheck = await SimpleCheck.deploy({
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await simpleCheck.deployed();
  
  console.log('\n✅ SimpleVerificationCheck:', simpleCheck.address);
  
  // ========================================
  // STEP 2: Add BTC Rule
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: ADD BTC PRICE RULE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
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
  console.log('\n✅ BTC Rule added, ID:', btcRuleId);
  
  // ========================================
  // STEP 3: Add Check to BTC Rule
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: ADD CHECK TO BTC RULE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const checkTx = await app.addCheck(btcRuleId, simpleCheck.address, "0x", 100, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await checkTx.wait();
  
  console.log('\n✅ Check added to Rule', btcRuleId);
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ SETUP COMPLETE!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Summary:');
  console.log('   App Address:', APP);
  console.log('   SimpleVerificationCheck:', simpleCheck.address);
  console.log('   BTC Rule ID:', btcRuleId);
  console.log('   Score will call: ReputationRegistry.giveFeedback(agentId, score)');
}

main().catch(console.error);
