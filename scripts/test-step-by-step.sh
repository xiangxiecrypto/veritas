#!/bin/bash
# Veritas Neat - 完整测试脚本（分步显示）

set -e

cd /home/xiang/.openclaw/workspace/veritas-protocol

echo ""
echo "=========================================="
echo "  Veritas Neat - 完整测试流程"
echo "  ========================================"
echo ""

# 步骤 1: 编译
echo "📦 步骤 1: 编译合约"
echo "======================================"
rm -rf artifacts cache 2>/dev/null || true

echo "执行: npm run compile"
npm run compile 2>&1 | grep -E "(Compiled|Solidity|Nothing to compile)" | tail -5

if [ ! -d "artifacts/contracts" ]; then
    echo "❌ 编译失败"
    exit 1
fi

echo "✅ 编译成功"
echo ""

# 步骤 2: 部署
echo "🚀 步骤 2: 部署合约到 Base Sepolia"
echo "======================================"
echo "网络: Base Sepolia (Chain ID: 84532)"
echo "RPC: https://sepolia.base.org"
echo "Primus ZKTLS: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8"
echo ""

echo "执行: npx hardhat run scripts/deploy-real-apis.ts --network baseSepolia"
echo ""

npx hardhat run scripts/deploy-real-apis.ts --network baseSepolia 2>&1 | tee /tmp/deploy-output.txt

echo ""

# 提取地址
RULE_REGISTRY=$(grep "RuleRegistry:" /tmp/deploy-output.txt | awk '{print $2}')
HTTP_CHECK=$(grep "HTTPCheck:" /tmp/deploy-output.txt | awk '{print $2}')
VALIDATOR=$(grep "VeritasValidator:" /tmp/deploy-output.txt | awk '{print $2}')

echo "======================================"
echo "✅ 部署完成"
echo ""
echo "合约地址:"
echo "  RuleRegistry:    $RULE_REGISTRY"
echo "  HTTPCheck:       $HTTP_CHECK"
echo "  VeritasValidator: $VALIDATOR"
echo ""

if [ ! -z "$VALIDATOR" ]; then
    echo "区块浏览器:"
    echo "  https://sepolia.basescan.org/address/$VALIDATOR"
    echo ""
fi

# 步骤 3: 测试说明
echo "📝 步骤 3: 准备测试 zktls"
echo "======================================"
echo ""
echo "接下来需要测试 zktls 和 validate:"
echo ""
echo "1. zktls: 调用真实 API 生成 attestation"
echo "   - API 1: CoinGecko (GET ETH price)"
echo "   - API 2: Binance (GET BTC price)"
echo "   - API 3: JSONPlaceholder (POST)"
echo ""
echo "2. validate: 在链上验证 attestation"
echo "   - 检查 recipient"
echo "   - Primus 验证"
echo "   - 执行规则检查"
echo ""
echo "需要的信息:"
echo "  - VeritasValidator: $VALIDATOR"
echo "  - Primus APP ID: 已配置"
echo "  - Primus SECRET: 已配置"
echo ""

# 保存地址供后续使用
echo "VALIDATOR_ADDRESS=$VALIDATOR" > /tmp/veritas-addresses.txt

echo "======================================"
echo "部署信息已保存到: /tmp/veritas-addresses.txt"
echo ""
