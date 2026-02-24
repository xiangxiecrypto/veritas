const hre = require("hardhat");

async function main() {
  const APP = "0xA551A71A4feFa37d53339d1FA151628C38E8F7c3";
  const CHECK0 = "0x374bE654c08DE2C688f49d13E65b34C087e7e49E"; // always true
  
  const [signer] = await hre.ethers.getSigners();
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await hre.ethers.provider.getGasPrice();
  
  // Rule 1: Coinbase BTC/USD
  console.log('Adding Rule 1...');
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
  
  // Check 0: Always true = 90 score
  console.log('Adding Check 0...');
  const checkTx = await app.addCheck(1, CHECK0, "0x", 90, {
    gasPrice: gasPrice.mul(3)
  });
  await checkTx.wait();
  console.log('Check 0 added');
  
  console.log('\nDone!');
}

main().catch(console.error);
