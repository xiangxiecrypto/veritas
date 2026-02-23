const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  
  const [signer] = await hre.ethers.getSigners();
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await hre.ethers.provider.getGasPrice();
  
  // Rule 1: Coinbase BTC/USD
  console.log('Adding Rule 1: Coinbase BTC/USD');
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
  
  // Check 0 for Rule 1: URL/dataKey/parsePath verification = 90 score
  // Params: empty (just verify structure)
  console.log('Adding Check 0 for Rule 1');
  const checkParams = "0x"; // Empty params
  const checkTx = await app.addCheck(1, "0x0000000000000000000000000000000000000001", checkParams, 90, {
    gasPrice: gasPrice.mul(3)
  });
  await checkTx.wait();
  console.log('Check 0 added');
  
  console.log('\nDone!');
}

main().catch(console.error);
