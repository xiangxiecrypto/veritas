const { ethers } = require("hardhat");

const RULE_REGISTRY = '0xa289903bc4C5bd98d116F8e47fEB93Fdf0e30d39';

const RULE_ABI = [
  "function getRule(uint256 ruleId) view returns (tuple(uint256 id, string name, string description, address checkContract, string urlTemplate, string expectedDataKey, string expectedParsePath, bytes checkData, bool active, uint256 maxAge))",
  "function nextRuleId() view returns (uint256)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  const ruleRegistry = new ethers.Contract(RULE_REGISTRY, RULE_ABI, signer);
  
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   Veritas V9 - 灵活的 Check 合约架构                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log('核心概念: 不同的 URL 可以使用不同的 Check 合约');
  console.log('每个规则独立配置 Check 合约地址和验证逻辑');
  console.log('');
  
  const HTTP_CHECK_V9 = '0xd359552C4aDD3Ee03F3eaF4e84a5CF2616Fe633C';
  const JSON_PATH_CHECK = '0x4C5810915fffEe7Cd998Eaa02C19CbAdb7FF24dB';
  
  console.log('已部署的 Check 合约:');
  console.log('  ┌─────────────────────────────────────────────────────────┐');
  console.log('  │ 1. HTTPCheckV9                                          │');
  console.log('  │    地址: ' + HTTP_CHECK_V9.substring(0, 20) + '...' + '             │');
  console.log('  │    功能: 基础 HTTP 验证 (URL, Method, DataKey)          │');
  console.log('  └─────────────────────────────────────────────────────────┘');
  console.log('  ┌─────────────────────────────────────────────────────────┐');
  console.log('  │ 2. JSONPathCheck                                        │');
  console.log('  │    地址: ' + JSON_PATH_CHECK.substring(0, 20) + '...' + '             │');
  console.log('  │    功能: 高级 JSON 验证 (前缀/后缀/嵌套路径)             │');
  console.log('  └─────────────────────────────────────────────────────────┘');
  console.log('');
  
  const nextId = await ruleRegistry.nextRuleId();
  
  console.log('规则配置 (不同 URL → 不同 Check 合约):');
  console.log('');
  
  for (let i = 1; i < parseInt(nextId.toString()); i++) {
    const rule = await ruleRegistry.getRule(i);
    
    const isHTTPCheck = rule.checkContract.toLowerCase() === HTTP_CHECK_V9.toLowerCase();
    const checkType = isHTTPCheck ? 'HTTPCheckV9' : 'JSONPathCheck';
    
    console.log(`┌─────────────────────────────────────────────────────────────────┐`);
    console.log(`│ 规则 ${i}: ${rule.name.padEnd(52)}│`);
    console.log(`├─────────────────────────────────────────────────────────────────┤`);
    console.log(`│ URL:     ${rule.urlTemplate.padEnd(54)}│`);
    console.log(`│ Check:   ${checkType.padEnd(54)}│`);
    console.log(`│          ${rule.checkContract.substring(0, 30) + '...'.padEnd(54)}│`);
    console.log(`│ DataKey: ${rule.expectedDataKey.padEnd(54)}│`);
    console.log(`│ Path:    ${rule.expectedParsePath.padEnd(54)}│`);
    console.log(`│ MaxAge:  ${(rule.maxAge.toString() + ' 秒').padEnd(54)}│`);
    console.log(`└─────────────────────────────────────────────────────────────────┘`);
    console.log('');
  }
  
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  关键优势                                                        ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                  ║');
  console.log('║  1. 一个通用 VeritasValidator (0x8f65...6990)                    ║');
  console.log('║     支持无限多种 Check 合约                                       ║');
  console.log('║                                                                  ║');
  console.log('║  2. 每个规则可以:                                                ║');
  console.log('║     - 使用不同的 Check 合约                                       ║');
  console.log('║     - 定义不同的验证逻辑                                          ║');
  console.log('║     - 配置不同的检查参数                                          ║');
  console.log('║                                                                  ║');
  console.log('║  3. 无需修改 VeritasValidator 即可添加新的验证类型                 ║');
  console.log('║     只需部署新的 Check 合约并创建规则                             ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log('合约地址:');
  console.log('  RuleRegistryV5:  0xa289903bc4C5bd98d116F8e47fEB93Fdf0e30d39');
  console.log('  HTTPCheckV9:     ' + HTTP_CHECK_V9);
  console.log('  JSONPathCheck:   ' + JSON_PATH_CHECK);
  console.log('  ValidatorV9:     0x8f650B4d1a8ac707E9fd5DBd911A0c106a776990');
  console.log('');
}

main().catch(console.error);
