/**
 * @title Setup Rules and Checks
 * @notice Configure validation rules and checks for the Veritas system
 */

const hre = require("hardhat");

// Update these addresses after deployment
const APP_ADDRESS = process.env.APP_ADDRESS || "0xC34E7059e1E891a4c42F9232D0162dCab92Fa0ec";
const SIMPLE_CHECK = process.env.SIMPLE_CHECK || "0xb8F13205a0f7754A5EFeb11a6B159F0d8C70ef55";
const MOLTBOOK_CHECK = process.env.MOLTBOOK_CHECK || "0x7BDFd547dc461932f9feeD0b52231E76bbFc52C8";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                SETUP RULES AND CHECKS                          ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Signer:', signer.address);
  console.log('App:', APP_ADDRESS);
  console.log('');

  const abi = [
    "function addRule(string url, string dataKey, string parsePath, uint8 decimals, uint256 maxAge, string description) returns (uint256)",
    "function addCheck(uint256 ruleId, address checkContract, bytes params, int128 score) returns (uint256)",
    "function ruleCount() view returns (uint256)"
  ];
  
  const app = new hre.ethers.Contract(APP_ADDRESS, abi, signer);

  // Rule 0: Coinbase BTC/USD
  console.log('📋 Adding Rule 0: Coinbase BTC/USD...');
  let tx = await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "btcPrice",
    "$.data.rates.USD",
    8,      // decimals
    3600,   // maxAge (1 hour)
    "Coinbase BTC/USD exchange rate"
  );
  await tx.wait();
  console.log('   ✅ Rule 0 added');
  
  // Add check for Rule 0
  console.log('   Adding SimpleVerificationCheck (score: 90)...');
  tx = await app.addCheck(0, SIMPLE_CHECK, "0x", 90);
  await tx.wait();
  console.log('   ✅ Check added');
  console.log('');

  // Rule 1: Moltbook Karma
  console.log('📋 Adding Rule 1: Moltbook Karma...');
  tx = await app.addRule(
    "https://www.moltbook.com/api/v1/agents/me",
    "karma",
    "$.agent.karma",
    0,      // decimals
    86400,  // maxAge (24 hours)
    "Moltbook agent karma"
  );
  await tx.wait();
  console.log('   ✅ Rule 1 added');
  
  // Add check for Rule 1
  console.log('   Adding MoltbookKarmaCheck (score: 98)...');
  tx = await app.addCheck(1, MOLTBOOK_CHECK, "0x", 98);
  await tx.wait();
  console.log('   ✅ Check added');
  console.log('');

  const ruleCount = await app.ruleCount();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                    ✅ SETUP COMPLETE                           ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Configuration:');
  console.log('   Rules:', ruleCount.toNumber());
  console.log('   Rule 0: BTC Price (check: SimpleVerificationCheck, score: 90)');
  console.log('   Rule 1: Moltbook Karma (check: MoltbookKarmaCheck, score: 98)');
  console.log('');
  console.log('Ready to validate! Run test/test-btc-sdk.js or test/test-moltbook-sdk.js');
  console.log('');
}

main().catch(console.error);
