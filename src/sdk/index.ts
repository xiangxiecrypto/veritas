/**
 * @fileoverview Veritas SDK - Simplified verification protocol
 * @description SDK for generating and verifying attestations using zktls-core-sdk
 * @module @veritas/sdk
 */

import { ethers, Signer, Contract, BytesLike } from 'ethers';
import { ZKTLS } from '@primus-labs/zktls-core-sdk';

/**
 * Configuration for Veritas SDK
 */
export interface VeritasConfig {
  /** Signer for transaction signing */
  signer: Signer;
  /** zktls-core-sdk configuration */
  zktlsConfig?: {
    /** Custom zktls endpoint (optional) */
    endpoint?: string;
    /** Debug mode */
    debug?: boolean;
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
 * Attestation result structure
 */
export interface AttestationResult {
  /** The attestation proof */
  attestation: string;
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
 * Validation result structure
 */
export interface ValidationResult {
  /** Whether validation passed */
  passed: boolean;
  /** Validation score (0-100) */
  score: number;
  /** Rule ID used */
  ruleId: number;
  /** Validation timestamp */
  timestamp: number;
  /** Attestation hash */
  attestationHash: string;
}

/**
 * Veritas SDK class
 * @description Main class for interacting with Veritas Protocol
 */
export class VeritasSDK {
  private zktls: ZKTLS;
  private signer: Signer;

  /**
   * Create a new Veritas SDK instance
   * @param config Configuration options
   */
  constructor(config: VeritasConfig) {
    this.signer = config.signer;
    
    // Initialize zktls-core-sdk
    this.zktls = new ZKTLS({
      endpoint: config.zktlsConfig?.endpoint,
      debug: config.zktlsConfig?.debug || false,
    });
  }

  /**
   * Execute an API call and generate an attestation
   * @param request API request configuration
   * @returns Attestation result
   */
  async executeWithProof(request: APIRequest): Promise<AttestationResult> {
    try {
      // 1. Execute API call
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      const responseData = await response.json();

      // 2. Generate attestation using zktls-core-sdk
      const attestation = await this.zktls.generateAttestation({
        request: {
          url: request.url,
          method: request.method,
          headers: request.headers || {},
          body: request.body ? JSON.stringify(request.body) : '',
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: JSON.stringify(responseData),
        },
        signer: this.signer,
      });

      // 3. Calculate attestation hash
      const attestationHash = ethers.keccak256(
        ethers.toUtf8Bytes(attestation.proof)
      );

      // 4. Return result
      return {
        attestation: attestation.proof,
        responseData: responseData,
        signature: attestation.signature,
        timestamp: Math.floor(Date.now() / 1000),
        attestationHash: attestationHash,
      };
    } catch (error) {
      throw new Error(`Failed to execute with proof: ${error}`);
    }
  }

  /**
   * Verify an attestation locally
   * @param attestation Attestation to verify
   * @returns Whether attestation is valid
   */
  async verifyAttestation(attestation: string): Promise<boolean> {
    try {
      return await this.zktls.verifyAttestation(attestation);
    } catch (error) {
      throw new Error(`Failed to verify attestation: ${error}`);
    }
  }

  /**
   * Submit attestation to validator for on-chain validation
   * @param validatorAddress Address of the VeritasValidator contract
   * @param attestation The attestation data
   * @param ruleId Rule ID to validate against
   * @param responseData Response data
   * @returns Validation result from blockchain
   */
  async validateAttestation(
    validatorAddress: string,
    attestation: string,
    ruleId: number,
    responseData: any
  ): Promise<ValidationResult> {
    
    const validatorAbi = [
      'function validate(bytes calldata attestation, uint256 ruleId, bytes calldata responseData) external returns (bool passed, uint256 score, bytes32 attestationHash)',
    ];

    const validator = new Contract(validatorAddress, validatorAbi, this.signer);

    const tx = await validator.validate(
      ethers.toUtf8Bytes(attestation),
      ruleId,
      ethers.toUtf8Bytes(JSON.stringify(responseData))
    );

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
        score: Number(parsed.args.score),
        ruleId: Number(parsed.args.ruleId),
        timestamp: Math.floor(Date.now() / 1000),
        attestationHash: parsed.args.attestationHash,
      };
    }

    throw new Error('Validation event not found');
  }

  /**
   * Get validation result from blockchain
   * @param validatorAddress Address of the VeritasValidator contract
   * @param attestationHash Hash of the attestation
   * @returns Validation result
   */
  async getValidationResult(
    validatorAddress: string,
    attestationHash: string
  ): Promise<ValidationResult> {
    
    const validatorAbi = [
      'function getValidationResult(bytes32 attestationHash) external view returns (uint256 ruleId, bool passed, uint256 score, uint256 timestamp)',
    ];

    const validator = new Contract(validatorAddress, validatorAbi, this.signer);

    const result = await validator.getValidationResult(attestationHash);

    return {
      ruleId: Number(result.ruleId),
      passed: result.passed,
      score: Number(result.score),
      timestamp: Number(result.timestamp),
      attestationHash: attestationHash,
    };
  }

  /**
   * Check if an attestation has been validated
   * @param validatorAddress Address of the VeritasValidator contract
   * @param attestationHash Hash of the attestation
   * @returns Whether attestation has been validated
   */
  async isValidated(
    validatorAddress: string,
    attestationHash: string
  ): Promise<boolean> {
    
    const validatorAbi = [
      'function isValidated(bytes32 attestationHash) external view returns (bool)',
    ];

    const validator = new Contract(validatorAddress, validatorAbi, this.signer);

    return await validator.isValidated(attestationHash);
  }
}

// Export types
export * from './types';
