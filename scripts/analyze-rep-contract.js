const hre = require("hardhat");

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

async function main() {
  const code = await ethers.provider.getCode(REPUTATION_REGISTRY);
  
  console.log('=== CONTRACT ANALYSIS ===\n');
  console.log('Address:', REPUTATION_REGISTRY);
  console.log('Code length:', (code.length - 2) / 2, 'bytes');
  
  // Check if it's a proxy (EIP-1967)
  const proxySelectors = [
    '5c60da1b', // implementation()
    'd784d426', // proxiableUUID()
    '3659cfe6', // upgradeTo()
    'f851a440', // admin()
    '52d1902d', // proxiable()
  ];
  
  console.log('\nChecking for proxy patterns...');
  for (const sel of proxySelectors) {
    if (code.includes(sel)) {
      console.log('  Found selector:', sel);
    }
  }
  
  // Check for common ERC functions
  const ercSelectors = {
    '70a08231': 'balanceOf(address)',
    '18160ddd': 'totalSupply()',
    '06fdde03': 'name()',
    '95d89b41': 'symbol()',
    '313ce567': 'decimals()',
  };
  
  console.log('\nChecking for ERC functions...');
  for (const [sel, name] of Object.entries(ercSelectors)) {
    if (code.includes(sel)) {
      console.log(`  ✅ ${name} (${sel})`);
    }
  }
  
  // Extract all 4-byte selectors from bytecode
  console.log('\nExtracting function selectors...');
  const selectors = new Set();
  for (let i = 0; i < code.length - 8; i += 2) {
    // Look for PUSH4 followed by potential selector usage
    if (code.substr(i, 2) === '63') {
      const selector = code.substr(i + 2, 8);
      if (selector.match(/^[0-9a-f]{8}$/)) {
        selectors.add(selector);
      }
    }
  }
  
  console.log('Found', selectors.size, 'potential selectors');
  console.log('First 20:', Array.from(selectors).slice(0, 20).join(', '));
}

main().catch(console.error);
