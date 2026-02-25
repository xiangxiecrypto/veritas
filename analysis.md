## 原 Veritas Protocol vs Veritas Neat 对比

### 原协议 (PrimusVeritasApp)

**架构特点：**
1. **使用 Primus TaskContract 作为中间层**
   - 不直接传递整个 Attestation
   - 通过 taskId 从 Primus 合约读取验证结果
   - 调用方式: `submitAttestation(taskId, url, result, timestamp)`

2. **数据流：**
```
SDK.attest() → Primus TaskContract (存储) 
  → submitAttestation() → 读取 TaskContract → 验证
```

3. **合约中的验证：**
```solidity
// 从 Primus 合约获取已验证的数据
(result, attestation) = primusZkTLS.verifyAttestation(taskId);

// 只需要验证 taskInfo
TaskInfo memory taskInfo = primusZkTLS.getTaskInfo(taskId);
```

4. **Gas 优化：**
   - 不传递大型结构体
   - 使用 taskId 引用已存储的数据
   - 只需要验证少量字段

---

### 新协议 (VeritasValidator)

**架构特点：**
1. **直接传递完整 Attestation**
   - 用户直接调用 `validate(attestation, ruleId)`
   - 需要在 calldata 中编码整个 Attestation 结构体

2. **数据流：**
```
SDK.attest() → 用户直接调用 validate(attestation)
  → 合约解码整个 Attestation → 验证
```

3. **合约中的验证：**
```solidity
// 需要解码整个结构体
IPrimusZKTLS.Attestation memory attestation = abi.decode(
    attestationData,
    (IPrimusZKTLS.Attestation)
);

// 然后传递给 Primus 验证
IPrimusZKTLS(primusAddress).verifyAttestation(attestation);
```

4. **问题：**
   - `abi.decode` 需要分配内存重建整个结构体
   - Attestation 包含多个动态数组和嵌套结构体
   - 内存分配过大导致 "out of memory"

---

### 核心差异

| 方面 | 原协议 | 新协议 |
|------|--------|--------|
| 数据传递 | taskId (轻量级) | 完整 Attestation (重量级) |
| 存储位置 | Primus TaskContract | 用户 calldata |
| 解码复杂度 | 低（只读几个字段） | 高（解码整个结构体） |
| Gas 效率 | 高 | 低（内存问题） |
| 耦合度 | 依赖 Primus TaskContract | 直接验证 |

---

### 为什么原协议可以？

1. **间接验证：** 通过 taskId 引用，不直接解码大结构体
2. **Primus 存储：** 数据存在 Primus 合约中，只需读取引用
3. **简化验证：** 只验证关键字段，不重建整个对象

### 新协议的问题

1. **直接传递：** 需要在交易中编码完整 Attestation
2. **双重解码：** 
   - 第一次：HTTPCheck 解码 Attestation
   - 第二次：Primus ZKTLS 再次解码
3. **内存翻倍：** 两次解码导致内存占用过高
