#!/bin/bash
# 完整测试脚本 - 一键部署和测试

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  Veritas Neat - 完整测试流程"
echo "  ========================================"
echo ""

# 切换到项目目录
cd /home/xiang/.openclaw/workspace/veritas-protocol

# 步骤 1: 清理
echo "步骤 1/5: 清理旧的构建文件..."
rm -rf artifacts cache deployment-output.log 2>/dev/null || true
echo "✅ 清理完成"
echo ""

# 步骤 2: 编译
echo "步骤 2/5: 编译合约..."
npm run compile 2>&1 | grep -E "(Compiled|Solidity|Error)" | tail -10

if [ ! -d "artifacts/contracts" ]; then
    echo "❌ 编译失败"
    exit 1
fi
echo "✅ 编译完成"
echo ""

# 步骤 3: 检查环境
echo "步骤 3/5: 检查环境配置..."
echo "  Primus APP ID: $PRIMUS_APP_ID"
echo "  网络配置: Base Sepolia"

if [ -z "$PRIMUS_APP_ID" ]; then
    echo "❌ PRIMUS_APP_ID 未设置"
    exit 1
fi
echo "✅ 环境配置正确"
echo ""

# 步骤 4: 部署
echo "步骤 4/5: 部署合约到 Base Sepolia..."
echo "这将部署:"
echo "  - RuleRegistry"
echo "  - HTTPCheck"
echo "  - VeritasValidator"
echo "  - 3 个 API 规则"
echo ""

npx hardhat run scripts/deploy-real-apis.ts --network baseSepolia 2>&1 | tee deployment-output.log

if grep -q "DEPLOYMENT COMPLETE" deployment-output.log; then
    echo ""
    echo "✅ 部署完成"
    
    # 提取合约地址
    echo ""
    echo "合约地址:"
    grep "VeritasValidator:" deployment-output.log || true
else
    echo ""
    echo "❌ 部署失败"
    cat deployment-output.log
    exit 1
fi
echo ""

# 步骤 5: 测试
echo "步骤 5/5: 运行真实 API 测试..."
echo ""
echo "将测试以下 API:"
echo "  1. CoinGecko - ETH 价格 (GET)"
echo "  2. Binance - BTC 价格 (GET)"
echo "  3. JSONPlaceholder - 创建 Post (POST)"
echo ""

# 提取 validator 地址
VALIDATOR_ADDRESS=$(grep "VeritasValidator:" deployment-output.log | awk '{print $2}')

if [ -z "$VALIDATOR_ADDRESS" ]; then
    echo "❌ 无法提取 validator 地址"
    exit 1
fi

echo "使用 Validator 地址: $VALIDATOR_ADDRESS"
echo ""

# 添加到环境变量
export VALIDATOR_ADDRESS

# 运行测试
npx hardhat run scripts/test-real-apis.ts --network baseSepolia 2>&1 | tee test-output.log

echo ""
echo "=========================================="
echo "  测试完成！"
echo "  ========================================"
echo ""

if grep -q "All tests completed" test-output.log; then
    echo "✅ 所有测试通过"
else
    echo "⚠️  部分测试可能失败，请查看日志"
fi

echo ""
echo "日志文件:"
echo "  - deployment-output.log (部署日志)"
echo "  - test-output.log (测试日志)"
