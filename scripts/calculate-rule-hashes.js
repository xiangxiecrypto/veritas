const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Calculate keccak256 hash of rule JSON content
 * @param {string} rulePath - Path to rule JSON file
 * @returns {string} - keccak256 hash
 */
function calculateRuleHash(rulePath) {
  const content = fs.readFileSync(rulePath, 'utf8');
  return hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(content));
}

/**
 * Load rule JSON and return content + hash
 * @param {string} rulePath - Path to rule JSON file
 */
function loadRule(rulePath) {
  const content = fs.readFileSync(rulePath, 'utf8');
  const rule = JSON.parse(content);
  const hash = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(content));
  
  return {
    hash,
    content: rule,
    json: content
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('RULE HASH CALCULATOR');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const rulesDir = path.join(__dirname, '../rules');
  const files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.json'));
  
  console.log('Rules found:', files.length, '\n');
  
  for (const file of files) {
    const rulePath = path.join(rulesDir, file);
    const rule = loadRule(rulePath);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('File:', file);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Hash:', rule.hash);
    console.log('URL:', rule.content.url);
    console.log('Data Key:', rule.content.dataKey);
    console.log('Parse Path:', rule.content.parsePath);
    console.log('Description:', rule.content.description);
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Use these hashes as Rule IDs');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(console.error);
