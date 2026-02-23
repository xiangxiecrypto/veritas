const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  
  const [signer] = await hre.ethers.getSigners();
  const gasPrice = await hre.ethers.provider.getGasPrice();
  
  console.log('Deploying SimpleVerificationCheck...');
  const Check = await hre.ethers.getContractFactory("SimpleVerificationCheck");
  const check = await Check.deploy();
  await check.deployed();
  console.log('Check:', check.address);
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Rule 1: Coinbase BTC/USD
  console.log('\nAdding Rule 1...');
  const ruleTx = await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "btcPrice",
    "$.data.rates.USD",
    0,
    3600,
    "Coinbase BTC/USD Price",
    { gasPrice: gasPrice.mul(3) }
  );
  await ruleTx.wait();
  console.log('Rule 1 added');
  
  // Check 0: Simple verification = 90 score
  console.log('\nAdding Check 0...');
  const checkTx = await app.addCheck(1, check.address, "0x", 90, {
    gasPrice: gasPrice.mul(3)
  });
  await checkTx.wait();
  console.log('Check 0 added');
  
  console.log('\nDone!');
}

main().catch(console.error);
