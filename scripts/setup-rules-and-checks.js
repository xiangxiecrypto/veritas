const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

const APP = "0x09Ac6476C745271599E0BB55Ef9C9570Ac15f899";

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log('═══════════════════════════════════════════════════════');
  console.log('SETTING UP RULES AND CHECKS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Deployer:', wallet.address);
  console.log('App:', APP);
  console.log('');
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // ========================================
  // STEP 1: Deploy Check Contracts
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY CHECK CONTRACTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Deploy SimpleVerificationCheck
  console.log('\n📦 Deploying SimpleVerificationCheck...');
  const SimpleCheck = await hre.ethers.getContractFactory("SimpleVerificationCheck");
  const simpleCheck = await SimpleCheck.deploy({
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await simpleCheck.deployed();
  console.log('✅ SimpleVerificationCheck:', simpleCheck.address);
  console.log('   Tx:', simpleCheck.deployTransaction.hash);
  
  // Deploy MoltbookKarmaCheck
  console.log('\n📦 Deploying MoltbookKarmaCheck...');
  const KarmaCheck = await hre.ethers.getContractFactory("MoltbookKarmaCheck");
  const karmaCheck = await KarmaCheck.deploy({
    gasPrice: gasPrice.mul(3),
    gasLimit: 1000000
  });
  await karmaCheck.deployed();
  console.log('✅ MoltbookKarmaCheck:', karmaCheck.address);
  console.log('   Tx:', karmaCheck.deployTransaction.hash);
  
  // ========================================
  // STEP 2: Add Rules
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: ADD RULES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
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
  
  // Add Moltbook Karma Rule
  console.log('\n📦 Adding Moltbook Karma Rule...');
  const karmaTx = await app.addRule(
    "https://www.moltbook.com/api/v1/agents/me",
    "karma",
    "$.agent.karma",
    0,
    3600,
    "Moltbook Protected Profile - Karma",
    { gasPrice: gasPrice.mul(3), gasLimit: 500000 }
  );
  await karmaTx.wait();
  
  const karmaRuleId = (await app.ruleCount()).toNumber() - 1;
  console.log('✅ Moltbook Karma Rule added, ID:', karmaRuleId);
  console.log('   Tx:', karmaTx.hash);
  
  // ========================================
  // STEP 3: Add Checks
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: ADD CHECKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Add SimpleVerificationCheck to BTC Rule
  console.log('\n📦 Adding SimpleVerificationCheck to BTC Rule...');
  const btcCheckTx = await app.addCheck(btcRuleId, simpleCheck.address, "0x", 100, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await btcCheckTx.wait();
  console.log('✅ SimpleVerificationCheck added to BTC Rule');
  console.log('   Tx:', btcCheckTx.hash);
  
  // Add MoltbookKarmaCheck to Moltbook Rule
  console.log('\n📦 Adding MoltbookKarmaCheck to Moltbook Rule...');
  const karmaCheckTx = await app.addCheck(karmaRuleId, karmaCheck.address, "0x", 100, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await karmaCheckTx.wait();
  console.log('✅ MoltbookKarmaCheck added to Moltbook Rule');
  console.log('   Tx:', karmaCheckTx.hash);
  
  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ SETUP COMPLETE!');
  console.log('═══════════════════════════════════════════════════════');
  
  console.log('\n📋 Contracts Deployed:');
  console.log('   SimpleVerificationCheck:', simpleCheck.address);
  console.log('   MoltbookKarmaCheck:', karmaCheck.address);
  
  console.log('\n📋 Rules Added:');
  console.log('   BTC Price Rule ID:', btcRuleId);
  console.log('   Moltbook Karma Rule ID:', karmaRuleId);
  
  console.log('\n📋 Checks Added:');
  console.log('   BTC Rule Check 0:', simpleCheck.address, '(score: 100)');
  console.log('   Moltbook Rule Check 0:', karmaCheck.address, '(score: 100)');
  
  // Save to file
  const config = {
    app: APP,
    checks: {
      simple: simpleCheck.address,
      karma: karmaCheck.address
    },
    rules: {
      btc: btcRuleId,
      karma: karmaRuleId
    },
    deployedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../config.json'),
    JSON.stringify(config, null, 2)
  );
  
  console.log('\n✅ Config saved to config.json');
}

main().catch(console.error);
