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
}

/**
 * Job structure (compatible with ACP)
 */
export interface Job {
  /** Job ID */
  id: string;
  /** Buyer address */
  buyer: string;
  /** Seller address */
  seller: string;
  /** Payment amount */
  amount: bigint;
  /** Job status */
  status: number;
  /** Whether verification is required */
  verificationRequired: boolean;
  /** Rule ID for verification */
  ruleId: number;
  /** Whether verification passed */
  verificationPassed: boolean;
  /** Verification score */
  verificationScore: number;
  /** Result data */
  resultData: string;
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

      // 3. Return result
      return {
        attestation: attestation.proof,
        responseData: responseData,
        signature: attestation.signature,
        timestamp: Math.floor(Date.now() / 1000),
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
   * Submit a completed job to the escrow contract
   * @param escrowAddress Address of the EnhancedEscrow contract
   * @param jobId Job identifier
   * @param result Attestation result
   */
  async submitJobResult(
    escrowAddress: string,
    jobId: string,
    result: AttestationResult
  ): Promise<ethers.ContractTransactionReceipt> {
    
    const escrowAbi = [
      'function completeJob(bytes32 jobId, bytes calldata attestation, bytes calldata responseData) external',
    ];

    const escrow = new Contract(escrowAddress, escrowAbi, this.signer);

    const tx = await escrow.completeJob(
      ethers.encodeBytes32String(jobId),
      ethers.toUtf8Bytes(result.attestation),
      ethers.toUtf8Bytes(JSON.stringify(result.responseData))
    );

    return await tx.wait();
  }

  /**
   * Get job details from escrow
   * @param escrowAddress Address of the EnhancedEscrow contract
   * @param jobId Job identifier
   * @returns Job details
   */
  async getJob(escrowAddress: string, jobId: string): Promise<Job> {
    
    const escrowAbi = [
      'function getJob(bytes32 jobId) external view returns (tuple(bytes32 id, address buyer, address seller, uint256 amount, uint8 status, uint256 createdAt, uint256 acceptedAt, uint256 completedAt, uint256 confirmedAt, bool verificationRequired, uint256 ruleId, bool verificationPassed, uint256 verificationScore, bytes resultData))',
    ];

    const escrow = new Contract(escrowAddress, escrowAbi, this.signer);

    const job = await escrow.getJob(ethers.encodeBytes32String(jobId));

    return {
      id: ethers.decodeBytes32String(job.id),
      buyer: job.buyer,
      seller: job.seller,
      amount: job.amount,
      status: job.status,
      verificationRequired: job.verificationRequired,
      ruleId: Number(job.ruleId),
      verificationPassed: job.verificationPassed,
      verificationScore: Number(job.verificationScore),
      resultData: ethers.toUtf8String(job.resultData),
    };
  }

  /**
   * Check if a job has been verified
   * @param validatorAddress Address of the VeritasValidator contract
   * @param jobId Job identifier
   * @returns Validation result
   */
  async getValidationResult(
    validatorAddress: string,
    jobId: string
  ): Promise<ValidationResult> {
    
    const validatorAbi = [
      'function getValidationResult(bytes32 jobId) external view returns (uint256 ruleId, bool passed, uint256 score, uint256 timestamp)',
    ];

    const validator = new Contract(validatorAddress, validatorAbi, this.signer);

    const result = await validator.getValidationResult(
      ethers.encodeBytes32String(jobId)
    );

    return {
      ruleId: Number(result.ruleId),
      passed: result.passed,
      score: Number(result.score),
      timestamp: Number(result.timestamp),
    };
  }
}

// Export types
export * from './types';
