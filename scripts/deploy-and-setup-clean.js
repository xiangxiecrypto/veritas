const hre = require("hardhat");

const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const [wallet] = await ethers.getSigners();
  const gasPrice = await ethers.provider.getGasPrice();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('           DEPLOY & SETUP PrimusVeritasApp (CLEAN)             ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Deployer:', wallet.address);
  console.log('');
  
  // ========================================
  // STEP 1: DEPLOY CONTRACTS
  // ========================================
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  STEP 1: DEPLOY CONTRACTS                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Deploy PrimusVeritasApp
  console.log('📦 Deploying PrimusVeritasApp...');
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(
    REGISTRY,
    PRIMUS_TASK,
    REPUTATION_REGISTRY,
    { gasPrice: gasPrice.mul(3), gasLimit: 3000000 }
  );
  await app.deployed();
  console.log('✅ PrimusVeritasApp:', app.address);
  console.log('   Tx:', app.deployTransaction.hash);
  
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
  // STEP 2: ADD RULES
  // ========================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  STEP 2: ADD RULES                                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Add BTC Price Rule
  console.log('📦 Adding BTC Price Rule...');
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
  // STEP 3: ADD CHECKS
  // ========================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  STEP 3: ADD CHECKS                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Add SimpleVerificationCheck to BTC Rule (Score: 90)
  console.log('📦 Adding SimpleVerificationCheck to BTC Rule (Score: 90)...');
  const btcCheckTx = await app.addCheck(btcRuleId, simpleCheck.address, "0x", 90, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await btcCheckTx.wait();
  console.log('✅ SimpleVerificationCheck added (Check ID: 0)');
  console.log('   Tx:', btcCheckTx.hash);
  
  // Add MoltbookKarmaCheck to Moltbook Rule (Score: 98)
  console.log('\n📦 Adding MoltbookKarmaCheck to Moltbook Rule (Score: 98)...');
  const karmaCheckTx = await app.addCheck(karmaRuleId, karmaCheck.address, "0x", 98, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  await karmaCheckTx.wait();
  console.log('✅ MoltbookKarmaCheck added (Check ID: 0)');
  console.log('   Tx:', karmaCheckTx.hash);
  
  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('                    ✅ DEPLOYMENT COMPLETE!                     ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 Contracts:');
  console.log('   PrimusVeritasApp:     ', app.address);
  console.log('   SimpleVerificationCheck:', simpleCheck.address);
  console.log('   MoltbookKarmaCheck:  ', karmaCheck.address);
  console.log('');
  console.log('📋 Rules:');
  console.log('   BTC Price (ID: ' + btcRuleId + '):');
  console.log('     URL: https://api.coinbase.com/v2/exchange-rates?currency=BTC');
  console.log('     dataKey: btcPrice, parsePath: $.data.rates.USD');
  console.log('');
  console.log('   Moltbook Karma (ID: ' + karmaRuleId + '):');
  console.log('     URL: https://www.moltbook.com/api/v1/agents/me');
  console.log('     dataKey: karma, parsePath: $.agent.karma');
  console.log('');
  console.log('📋 Checks:');
  console.log('   BTC Rule:      Check 0 = SimpleVerificationCheck (Score: 90)');
  console.log('   Moltbook Rule: Check 0 = MoltbookKarmaCheck (Score: 98)');
  console.log('');
  console.log('🔗 Connected Contracts:');
  console.log('   ValidationRegistry:  ', REGISTRY);
  console.log('   ReputationRegistry:  ', REPUTATION_REGISTRY);
  console.log('   Primus TaskContract: ', PRIMUS_TASK);
  console.log('');
  console.log('🌐 Explorers:');
  console.log('   App: https://sepolia.basescan.org/address/' + app.address);
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error);
