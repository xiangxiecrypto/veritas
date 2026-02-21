/**
 * Debug JSON Parsing in Check Contracts
 */

const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  
  // Use the latest deployed check contract
  const PRICE_RANGE_CHECK = '0xD091bff4A67485BaFd20f49dA3b3880bBA1e2214';
  
  const PriceRangeCheckABI = [
    'function validate(string memory dataKey, string memory attestationData, bytes memory params) external pure returns (bool passed, int128 value)'
  ];
  
  const priceRangeCheck = new ethers.Contract(PRICE_RANGE_CHECK, PriceRangeCheckABI, provider);

  console.log('Testing JSON Parsing...\n');

  // Test 1: Simple JSON
  const simpleJson = '{"USD":"97000.00"}';
  const simpleParams = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]
  );
  
  console.log('Test 1: Simple JSON');
  console.log('  JSON:', simpleJson);
  console.log('  Path: "USD"');
  
  try {
    const result1 = await priceRangeCheck.callStatic.validate('USD', simpleJson, simpleParams);
    console.log('  Result: passed=', result1.passed, 'value=', result1.value.toString());
  } catch (e) {
    console.log('  Error:', e.message);
  }

  // Test 2: Nested JSON
  const nestedJson = '{"rates":{"USD":"97000.00"}}';
  console.log('\nTest 2: Nested JSON');
  console.log('  JSON:', nestedJson);
  console.log('  Path: "rates.USD"');
  
  try {
    const result2 = await priceRangeCheck.callStatic.validate('rates.USD', nestedJson, simpleParams);
    console.log('  Result: passed=', result2.passed, 'value=', result2.value.toString());
  } catch (e) {
    console.log('  Error:', e.message);
  }

  // Test 3: Deeply nested JSON
  const deepJson = '{"data":{"rates":{"USD":"97000.00"}}}';
  console.log('\nTest 3: Deeply Nested JSON');
  console.log('  JSON:', deepJson);
  console.log('  Path: "data.rates.USD"');
  
  try {
    const result3 = await priceRangeCheck.callStatic.validate('data.rates.USD', deepJson, simpleParams);
    console.log('  Result: passed=', result3.passed, 'value=', result3.value.toString());
  } catch (e) {
    console.log('  Error:', e.message);
  }

  // Test 4: Coinbase-like structure
  const coinbaseJson = JSON.stringify({
    data: {
      currency: "BTC",
      rates: {
        USD: "97000.00"
      }
    }
  });
  
  console.log('\nTest 4: Coinbase-like JSON');
  console.log('  JSON:', coinbaseJson);
  console.log('  Path: "data.rates.USD"');
  
  try {
    const result4 = await priceRangeCheck.callStatic.validate('data.rates.USD', coinbaseJson, simpleParams);
    console.log('  Result: passed=', result4.passed, 'value=', result4.value.toString());
  } catch (e) {
    console.log('  Error:', e.message);
  }
}

main().catch(console.error);
