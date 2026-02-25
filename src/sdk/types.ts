/**
 * @fileoverview Type definitions for Veritas Protocol
 * @description Shared types for Veritas SDK and contracts
 */

/**
 * Job status enum (must match contract)
 */
export enum JobStatus {
  Pending = 0,
  InProgress = 1,
  Completed = 2,
  Confirmed = 3,
  Disputed = 4,
  Settled = 5,
  Cancelled = 6,
}

/**
 * Rule structure from RuleRegistry
 */
export interface Rule {
  id: bigint;
  name: string;
  description: string;
  checkContract: string;
  checkData: string;
  requiredScore: bigint;
  active: boolean;
  creator: string;
  createdAt: bigint;
}

/**
 * HTTP check data structure
 */
export interface HTTPCheckData {
  expectedUrl: string;
  expectedMethod: string;
  minResponseCode: number;
  maxResponseCode: number;
  expectedResponsePattern: string;
}

/**
 * Validation result from VeritasValidator
 */
export interface OnChainValidationResult {
  ruleId: bigint;
  passed: boolean;
  score: bigint;
  timestamp: bigint;
}

/**
 * Attestation structure from zktls-core-sdk
 */
export interface Attestation {
  proof: string;
  signature: string;
  timestamp: number;
  data: {
    request: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body: string;
    };
    response: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: string;
    };
  };
}

/**
 * Contract addresses for deployment
 */
export interface DeploymentAddresses {
  ruleRegistry: string;
  veritasValidator: string;
  httpCheck: string;
  escrow: string;
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  network: string;
  deployer: string;
  initialAdmin: string;
}
