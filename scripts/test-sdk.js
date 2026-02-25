/**
 * Complete test using Veritas SDK
 */

const { ethers } = require("hardhat");
const { PrimusCoreTLS } = require("@primuslabs/zktls-core-sdk");
const config = require("../deployed-config.json");

const APP_ID = '0xd260f1ace82a81d1784d20a3cf38e94a17777374';
const APP_SECRET = '0x5d065922ad4742d567a9de666f4876d91238ef390af77463f74d683292e78304';

// SDK Implementation
class VeritasSDK {
  constructor(config) {
    this.signer = config.signer;
    this.validatorAddress = config.validatorAddress;
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.primus = new PrimusCoreTLS();
  }

  async init() {
    await this.primus.init(this.appId, this.appSecret);
  }

  async attest(request, responseResolves) {
    const recipient = await this.signer.getAddress();
    const genRequest = this.primus.generateRequestParams(
      {
        url: request.url,
        method: request.method,
        header: request.headers || {},
        body: request.body || '',
      },
      responseResolves.map(r => ({
        keyName: r.keyName,
        parseType: r.parseType,
        parsePath: r.parsePath,
      })),
      recipient
    );

    const attestation = await this.primus.startAttestation(genRequest);
    const verified = this.primus.verifyAttestation(attestation);
    const attestationHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(attestation))
    );

    return {
      attestation,
      responseData: attestation.data,
      signature: attestation.signatures[0] || '',
      timestamp: Number(attestation.timestamp) / 1000,
      attestationHash,
      verified,
    };
  }

  async validate(attestation, ruleId) {
    const validatorAbi = [
      'function validate(tuple(address recipient, tuple(string url, string header, string method, string body) request, tuple(string keyName, string parseType, string parsePath)[] reponseResolve, string data, string attConditions, uint64 timestamp, string additionParams, tuple(address attestorAddr, string url)[] attestors, bytes[] signatures) attestation, uint256 ruleId) external returns (bool passed, bytes32 attestationHash)',
      'event ValidationPerformed(bytes32 indexed attestationHash, uint256 indexed ruleId, bool passed, address indexed recipient, address validator)',
    ];

    const validator = new ethers.Contract(this.validatorAddress, validatorAbi, this.signer);
    const tx = await validator.validate(attestation, ruleId);
    const receipt = await tx.wait();

    const event = receipt.logs.find((log) => {
      try {
        const parsed = validator.interface.parseLog(log);
        return parsed?.name === 'ValidationPerformed';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('ValidationPerformed event not found');
    }

    const parsed = validator.interface.parseLog(event);
    return {
      passed: parsed.args.passed,
      ruleId: Number(parsed.args.ruleId),
      timestamp: Math.floor(Date.now() / 1000),
      attestationHash: parsed.args.attestationHash,
      recipient: parsed.args.recipient,
      validator: parsed.args.validator,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  }

  formatAttestation(attestation) {
    const lines = [
      '╔══════════════════════════════════════════════════════════════════╗',
      '║                    ATTESTATION DETAILS                           ║',
      '╠══════════════════════════════════════════════════════════════════╣',
      `║ Recipient: ${attestation.recipient.substring(0, 42).padEnd(55)} ║`,
      '╠══════════════════════════════════════════════════════════════════╣',
      '║ REQUEST:',
      `║   URL:     ${attestation.request.url.substring(0, 52).padEnd(52)} ║`,
      `║   Method:  ${attestation.request.method.padEnd(52)} ║`,
      '╠══════════════════════════════════════════════════════════════════╣',
      '║ RESPONSE RESOLVES:',
    ];

    attestation.reponseResolve.forEach((resolve, i) => {
      lines.push(`║   [${i}] KeyName:  ${resolve.keyName.padEnd(45)} ║`);
      lines.push(`║       ParsePath: ${resolve.parsePath.padEnd(45)} ║`);
    });

    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push('║ RESPONSE DATA:');
    const dataStr = attestation.data.length > 55
      ? attestation.data.substring(0, 52) + '...'
      : attestation.data;
    lines.push(`║   ${dataStr.padEnd(63)} ║`);

    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push(`║ Timestamp: ${attestation.timestamp.toString().padEnd(53)} ║`);
    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push('║ SIGNATURES:');
    attestation.signatures.forEach((sig, i) => {
      const shortSig = sig.substring(0, 25) + '...' + sig.substring(sig.length - 10);
      lines.push(`║   [${i}] ${shortSig.padEnd(55)} ║`);
    });
    lines.push('╚══════════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          VERITAS SDK - COMPLETE TEST                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  const [signer] = await ethers.getSigners();
  console.log('Signer Address:', signer.address);
  console.log('Validator:', config.contracts.VeritasValidator);
  console.log('');

  // Initialize SDK
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Initialize Veritas SDK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const sdk = new VeritasSDK({
    signer,
    validatorAddress: config.contracts.VeritasValidator,
    appId: APP_ID,
    appSecret: APP_SECRET,
  });

  await sdk.init();
  console.log('✅ SDK initialized');
  console.log('');

  // Test 1: BTC Price Attestation
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Generate Attestation for BTC Price (Rule 1)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Request Config:');
  console.log('  URL:    https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
  console.log('  Method: GET');
  console.log('  Resolve:');
  console.log('    - keyName:  price');
  console.log('    - parsePath: $.price');
  console.log('');

  const btcResult = await sdk.attest(
    {
      url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
      method: 'GET',
    },
    [
      {
        keyName: 'price',
        parseType: 'string',
        parsePath: '$.price',
      },
    ]
  );

  console.log('✅ Attestation Generated');
  console.log('');
  console.log('Attestation Metadata:');
  console.log('  Timestamp:', new Date(btcResult.timestamp * 1000).toISOString());
  console.log('  Local Verified:', btcResult.verified);
  console.log('  Hash:', btcResult.attestationHash);
  console.log('  Signature:', btcResult.signature.substring(0, 50) + '...');
  console.log('');

  // Display full attestation
  console.log(sdk.formatAttestation(btcResult.attestation));
  console.log('');

  // Validate on-chain
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: On-Chain Validation (Rule 1 - Binance BTC)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const validation1 = await sdk.validate(btcResult.attestation, 1);

  console.log('✅ Validation Complete');
  console.log('');
  console.log('Validation Result:');
  console.log('  Passed:', validation1.passed);
  console.log('  Rule ID:', validation1.ruleId);
  console.log('  Block Number:', validation1.blockNumber);
  console.log('  Gas Used:', validation1.gasUsed.toString());
  console.log('  Transaction:', validation1.transactionHash);
  console.log('');

  // Test 2: ETH Price Attestation
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: Generate Attestation for ETH Price (Rule 2)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Request Config:');
  console.log('  URL:    https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
  console.log('  Method: GET');
  console.log('  Resolve:');
  console.log('    - keyName:  price');
  console.log('    - parsePath: $.price');
  console.log('');

  const ethResult = await sdk.attest(
    {
      url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
      method: 'GET',
    },
    [
      {
        keyName: 'price',
        parseType: 'string',
        parsePath: '$.price',
      },
    ]
  );

  console.log('✅ Attestation Generated');
  console.log('');
  console.log('Attestation Metadata:');
  console.log('  Timestamp:', new Date(ethResult.timestamp * 1000).toISOString());
  console.log('  Local Verified:', ethResult.verified);
  console.log('  Hash:', ethResult.attestationHash);
  console.log('');

  console.log(sdk.formatAttestation(ethResult.attestation));
  console.log('');

  // Validate on-chain
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: On-Chain Validation (Rule 2 - Binance ETH)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const validation2 = await sdk.validate(ethResult.attestation, 2);

  console.log('✅ Validation Complete');
  console.log('');
  console.log('Validation Result:');
  console.log('  Passed:', validation2.passed);
  console.log('  Rule ID:', validation2.ruleId);
  console.log('  Block Number:', validation2.blockNumber);
  console.log('  Gas Used:', validation2.gasUsed.toString());
  console.log('  Transaction:', validation2.transactionHash);
  console.log('');

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                              ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                  ║');
  console.log('║  Test 1: BTC Price Attestation                                   ║');
  console.log('║    ✓ Generated:', btcResult.responseData.substring(0, 30).padEnd(35), '║');
  console.log('║    ✓ Validated: Block', validation1.blockNumber.toString().padEnd(32), '║');
  console.log('║                                                                  ║');
  console.log('║  Test 2: ETH Price Attestation                                   ║');
  console.log('║    ✓ Generated:', ethResult.responseData.substring(0, 30).padEnd(35), '║');
  console.log('║    ✓ Validated: Block', validation2.blockNumber.toString().padEnd(32), '║');
  console.log('║                                                                  ║');
  console.log('║  Contract Addresses:                                             ║');
  console.log('║    Validator:', config.contracts.VeritasValidator.substring(0, 25).padEnd(45), '║');
  console.log('║    Registry: ', config.contracts.RuleRegistry.substring(0, 25).padEnd(45), '║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
