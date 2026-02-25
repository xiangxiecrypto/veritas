/**
 * @fileoverview Neat Veritas SDK - Simplified verification protocol
 * @description Minimal SDK for generating and verifying attestations using zktls-core-sdk
 * @module @veritas/neat
 */

import { ethers, Signer, Contract } from 'ethers';
import { PrimusZKTLS } from '@primus-labs/zktls-core-sdk';

/**
 * Configuration for Neat Veritas SDK
 */
export interface NeatVeritasConfig {
  /** Signer for transaction signing */
  signer: Signer;
  
  /** zktls-core-sdk configuration */
  primusConfig?: {
    /** Primus App ID */
    appId: string;
    /** Primus App Secret */
    appSecret: string;
    /** Custom endpoint (optional) */
    endpoint?: string;
  };
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
  body?: any;
}

/**
 * Response resolve structure (for parsePath)
 */
export interface ResponseResolve {
  /** Key name to extract */
  keyName: string;
  /** Parse type (JSON, HTML, XML, TEXT) */
  parseType: 'JSON' | 'HTML' | 'XML' | 'TEXT';
  /** JSONPath or XPath to extract value */
  parsePath: string;
}

/**
 * Attestation result structure
 */
export interface AttestationResult {
  /** The attestation object */
  attestation: any;  // Attestation struct from Primus
  /** The response data */
  responseData: any;
  /** Signature */
  signature: string;
  /** Timestamp */
  timestamp: number;
  /** Attestation hash */
  attestationHash: string;
}

/**
 * Validation result structure (matches VeritasValidator.ValidationResult)
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
}

/**
 * NeatVeritasSDK class
 * @description Main class for interacting with Neat Veritas Protocol
 */
export class NeatVeritasSDK {
  private primus: PrimusZKTLS;
  private signer: Signer;
  private config: NeatVeritasConfig;
  
  /**
   * FIXED: Veritas Validator contract address
   * This is controlled by the protocol deployer and should not be changed
   */
  private static readonly VALIDATOR_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Replace with actual deployed address

  /**
   * Create a new Neat Veritas SDK instance
   * @param config Configuration options
   */
  constructor(config: NeatVeritasConfig) {
    this.config = config;
    this.signer = config.signer;
    
    // Initialize Primus ZKTLS
    this.primus = new PrimusZKTLS({
      appId: config.primusConfig?.appId,
      appSecret: config.primusConfig?.appSecret,
      endpoint: config.primusConfig?.endpoint,
    });
  }

  /**
   * Initialize the SDK
   */
  async init(): Promise<void> {
    if (this.config.primusConfig) {
      await this.primus.init(
        this.config.primusConfig.appId,
        this.config.primusConfig.appSecret
      );
    }
  }

  /**
   * Generate an attestation for an API call
   * @param request API request configuration
   * @param responseResolves Response extraction configuration
   * @returns Attestation result
   */
  async attest(
    request: APIRequest,
    responseResolves?: ResponseResolve[]
  ): Promise<AttestationResult> {
    try {
      // Prepare attestation request
      const attestRequest = {
        recipient: await this.signer.getAddress(),
        request: {
          url: request.url,
          method: request.method,
          headers: request.headers || {},
          body: request.body ? JSON.stringify(request.body) : '',
        },
        responseResolves: responseResolves || [],
      };

      // Generate attestation with Primus
      const attestation = await this.primus.startAttestation(attestRequest);

      // Calculate attestation hash
      const attestationHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(attestation))
      );

      return {
        attestation: attestation,
        responseData: attestation.data,
        signature: attestation.signatures?.[0] || '',
        timestamp: attestation.timestamp || Math.floor(Date.now() / 1000),
        attestationHash: attestationHash,
      };
    } catch (error) {
      throw new Error(`Failed to generate attestation: ${error}`);
    }
  }

  /**
   * Submit attestation to validator for on-chain validation
   * @param attestation The attestation object
   * @param ruleId Rule ID to validate against
   * @returns Validation result from blockchain
   */
  async validateAttestation(
    attestation: any,
    ruleId: number
  ): Promise<ValidationResult> {
    
    const validatorAbi = [
      'function validate(tuple(address recipient, tuple(string url, string header, string method, string body) request, tuple(string keyName, string parseType, string parsePath)[] reponseResolve, string data, string attConditions, uint64 timestamp, string additionParams, tuple(address attestorAddr, string url)[] attestors, bytes[] signatures) attestation, uint256 ruleId) external returns (bool passed, bytes32 attestationHash)',
    ];

    const validator = new Contract(
      NeatVeritasSDK.VALIDATOR_ADDRESS,
      validatorAbi,
      this.signer
    );

    const tx = await validator.validate(attestation, ruleId);
    const receipt = await tx.wait();

    // Parse event to get result
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = validator.interface.parseLog(log);
        return parsed?.name === 'ValidationPerformed';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = validator.interface.parseLog(event);
      return {
        passed: parsed.args.passed,
        ruleId: Number(parsed.args.ruleId),
        timestamp: Math.floor(Date.now() / 1000),
        attestationHash: parsed.args.attestationHash,
        recipient: parsed.args.recipient,
        validator: parsed.args.validator,
      };
    }

    throw new Error('Validation event not found');
  }

  /**
   * Get validation result from blockchain
   * @param attestationHash Hash of the attestation
   * @returns Validation result
   */
  async getValidationResult(
    attestationHash: string
  ): Promise<ValidationResult> {
    
    const validatorAbi = [
      'function getValidationResult(bytes32 attestationHash) external view returns (uint256 ruleId, bool passed, uint256 timestamp, address recipient, address validator)',
    ];

    const validator = new Contract(
      NeatVeritasSDK.VALIDATOR_ADDRESS,
      validatorAbi,
      this.signer
    );

    const result = await validator.getValidationResult(attestationHash);

    return {
      ruleId: Number(result.ruleId),
      passed: result.passed,
      timestamp: Number(result.timestamp),
      attestationHash: attestationHash,
      recipient: result.recipient,
      validator: result.validator,
    };
  }

  /**
   * Check if an attestation has been validated
   * @param attestationHash Hash of the attestation
   * @returns Whether attestation has been validated
   */
  async isValidated(
    attestationHash: string
  ): Promise<boolean> {
    
    const validatorAbi = [
      'function isValidated(bytes32 attestationHash) external view returns (bool)',
    ];

    const validator = new Contract(
      NeatVeritasSDK.VALIDATOR_ADDRESS,
      validatorAbi,
      this.signer
    );

    return await validator.isValidated(attestationHash);
  }
}

// Export types
export * from './types';

// Default export
export default NeatVeritasSDK;
