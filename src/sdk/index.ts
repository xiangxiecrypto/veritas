/**
 * @fileoverview NeatVeritasSDK - Simplified verification protocol
 * @description SDK for generating and verifying attestations with Veritas Protocol
 * @module @veritas/neat-sdk
 */

import { ethers, Signer, Contract } from 'ethers';
import { PrimusCoreTLS } from '@primuslabs/zktls-core-sdk';

/**
 * Configuration for NeatVeritasSDK
 */
export interface NeatVeritasConfig {
  /** Signer for transaction signing */
  signer: Signer;
  /** VeritasValidator contract address */
  validatorAddress: string;
  /** Primus App ID */
  appId: string;
  /** Primus App Secret */
  appSecret: string;
}

/**
 * API request structure
 */
export interface APIRequest {
  /** API URL */
  url: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: string;
}

/**
 * Response resolve structure
 */
export interface ResponseResolve {
  /** Key name to extract */
  keyName: string;
  /** Parse type */
  parseType: 'string';
  /** JSONPath to extract value */
  parsePath: string;
}

/**
 * Full attestation structure from Primus
 */
export interface Attestation {
  /** Recipient address */
  recipient: string;
  /** Request details */
  request: {
    url: string;
    header: string;
    method: string;
    body: string;
  };
  /** Response resolve config */
  reponseResolve: Array<{
    keyName: string;
    parseType: string;
    parsePath: string;
  }>;
  /** Response data */
  data: string;
  /** Attestation conditions */
  attConditions: string;
  /** Timestamp (milliseconds) */
  timestamp: bigint;
  /** Additional params */
  additionParams: string;
  /** Attestors info */
  attestors: Array<{
    attestorAddr: string;
    url: string;
  }>;
  /** Signatures */
  signatures: string[];
}

/**
 * Attestation result with metadata
 */
export interface AttestationResult {
  /** The full attestation object */
  attestation: Attestation;
  /** Response data extracted */
  responseData: string;
  /** First signature */
  signature: string;
  /** Timestamp in seconds */
  timestamp: number;
  /** Attestation hash */
  attestationHash: string;
  /** Whether local verification passed */
  verified: boolean;
}

/**
 * Validation result from blockchain
 */
export interface ValidationResult {
  /** Whether validation passed */
  passed: boolean;
  /** Rule ID used */
  ruleId: number;
  /** Validation timestamp */
  timestamp: number;
  /** Attestation hash */
  attestationHash: string;
  /** Attestation recipient */
  recipient: string;
  /** Who submitted the attestation */
  validator: string;
  /** Transaction hash */
  transactionHash?: string;
  /** Block number */
  blockNumber?: number;
  /** Gas used */
  gasUsed?: bigint;
}

/**
 * NeatVeritasSDK class
 * @description Main SDK for interacting with the Neat Veritas Protocol
 */
export class NeatVeritasSDK {
  private primus: PrimusCoreTLS;
  private signer: Signer;
  private validatorAddress: string;
  private appId: string;
  private appSecret: string;

  /**
   * Create a new NeatVeritasSDK instance
   * @param config Configuration options
   */
  constructor(config: NeatVeritasConfig) {
    this.signer = config.signer;
    this.validatorAddress = config.validatorAddress;
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.primus = new PrimusCoreTLS();
  }

  /**
   * Initialize the SDK
   */
  async init(): Promise<void> {
    await this.primus.init(this.appId, this.appSecret);
  }

  /**
   * Generate an attestation for an API call
   * @param request API request configuration
   * @param responseResolves Response extraction configuration
   * @returns Attestation result with full details
   */
  async attest(
    request: APIRequest,
    responseResolves: ResponseResolve[]
  ): Promise<AttestationResult> {
    // Generate signed request params
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

    // Start attestation
    const attestation = await this.primus.startAttestation(genRequest) as Attestation;

    // Verify locally
    const verified = this.primus.verifyAttestation(attestation);

    // Calculate attestation hash
    const attestationHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(attestation))
    );

    return {
      attestation,
      responseData: attestation.data,
      signature: attestation.signatures[0] || '',
      timestamp: Number(attestation.timestamp) / 1000, // Convert ms to seconds
      attestationHash,
      verified,
    };
  }

  /**
   * Submit attestation to validator for on-chain validation
   * @param attestation The attestation object
   * @param ruleId Rule ID to validate against
   * @returns Validation result from blockchain
   */
  async validate(
    attestation: Attestation,
    ruleId: number
  ): Promise<ValidationResult> {
    const validatorAbi = [
      'function validate(tuple(address recipient, tuple(string url, string header, string method, string body) request, tuple(string keyName, string parseType, string parsePath)[] reponseResolve, string data, string attConditions, uint64 timestamp, string additionParams, tuple(address attestorAddr, string url)[] attestors, bytes[] signatures) attestation, uint256 ruleId) external returns (bool passed, bytes32 attestationHash)',
      'event ValidationPerformed(bytes32 indexed attestationHash, uint256 indexed ruleId, bool passed, address indexed recipient, address validator)',
    ];

    const validator = new Contract(this.validatorAddress, validatorAbi, this.signer);

    const tx = await validator.validate(attestation, ruleId);
    const receipt = await tx.wait();

    // Find ValidationPerformed event
    const event = receipt.logs.find((log: any) => {
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

  /**
   * Get validation result from blockchain
   * @param attestationHash Hash of the attestation
   * @returns Validation result
   */
  async getValidationResult(attestationHash: string): Promise<ValidationResult> {
    const validatorAbi = [
      'function results(bytes32 attestationHash) view returns (uint256 ruleId, bool passed, uint256 timestamp, address validator, address recipient, bytes32 hash)',
    ];

    const validator = new Contract(this.validatorAddress, validatorAbi, this.signer);
    const result = await validator.results(attestationHash);

    return {
      ruleId: Number(result.ruleId),
      passed: result.passed,
      timestamp: Number(result.timestamp),
      attestationHash: result.attestationHash,
      recipient: result.recipient,
      validator: result.validator,
    };
  }

  /**
   * Format attestation for display
   * @param attestation The attestation object
   * @returns Formatted string
   */
  formatAttestation(attestation: Attestation): string {
    const lines = [
      '╔══════════════════════════════════════════════════════════════════╗',
      '║                    ATTESTATION DETAILS                           ║',
      '╠══════════════════════════════════════════════════════════════════╣',
      `║ Recipient:     ${attestation.recipient.substring(0, 42).padEnd(42)} ║`,
      '╠══════════════════════════════════════════════════════════════════╣',
      '║ REQUEST:',
      `║   URL:         ${attestation.request.url.substring(0, 50).padEnd(50)} ║`,
      `║   Method:      ${attestation.request.method.padEnd(50)} ║`,
      '╠══════════════════════════════════════════════════════════════════╣',
      '║ RESPONSE RESOLVES:',
    ];

    attestation.reponseResolve.forEach((resolve, i) => {
      lines.push(`║   [${i}] KeyName:  ${resolve.keyName.padEnd(42)} ║`);
      lines.push(`║       ParsePath: ${resolve.parsePath.padEnd(42)} ║`);
    });

    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push('║ RESPONSE DATA:');
    const dataStr = attestation.data.length > 60
      ? attestation.data.substring(0, 57) + '...'
      : attestation.data;
    lines.push(`║   ${dataStr.padEnd(62)} ║`);

    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push(`║ Timestamp:     ${attestation.timestamp.toString().padEnd(50)} ║`);
    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push('║ SIGNATURES:');
    attestation.signatures.forEach((sig, i) => {
      const shortSig = sig.substring(0, 30) + '...' + sig.substring(sig.length - 10);
      lines.push(`║   [${i}] ${shortSig.padEnd(54)} ║`);
    });
    lines.push('╚══════════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }
}

export default NeatVeritasSDK;
