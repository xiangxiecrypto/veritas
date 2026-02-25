const { ethers } = require("hardhat");
const { PrimusCoreTLS } = require("@primuslabs/zktls-core-sdk");
const config = require("../deployed-config.json");

const APP_ID = '0xd260f1ace82a81d1784d20a3cf38e94a17777374';
const APP_SECRET = '0x5d065922ad4742d567a9de666f4876d91238ef390af77463f74d683292e78304';

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
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          ETH PRICE TEST                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);

  const sdk = new VeritasSDK({
    signer,
    validatorAddress: config.contracts.VeritasValidator,
    appId: APP_ID,
    appSecret: APP_SECRET,
  });

  await sdk.init();
  console.log('✅ SDK initialized\n');

  // ETH Price Attestation
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Generating ETH Price Attestation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = await sdk.attest(
    { url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', method: 'GET' },
    [{ keyName: 'price', parseType: 'string', parsePath: '$.price' }]
  );

  console.log('✅ Attestation Generated\n');
  console.log('Timestamp:', new Date(result.timestamp * 1000).toISOString());
  console.log('Data:', result.responseData);
  console.log('Hash:', result.attestationHash);
  console.log('Verified:', result.verified);
  console.log('\n');

  // Validate
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('On-Chain Validation (Rule 2 - ETH)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const validation = await sdk.validate(result.attestation, 2);

  console.log('✅ Validation Complete\n');
  console.log('Result:');
  console.log('  Passed:', validation.passed);
  console.log('  Block:', validation.blockNumber);
  console.log('  Gas:', validation.gasUsed.toString());
  console.log('  Tx:', validation.transactionHash);
  console.log('');
}

main().catch(console.error);
