import { ethers } from 'ethers';
import { PrimusAttestationVerifier, AttestationVerificationResult, AttestationVerificationConfig } from './PrimusAttestationVerifier';
export interface VeritasConfig {
    provider: ethers.providers.Provider;
    signer: ethers.Signer;
    network?: 'mainnet' | 'sepolia';
    validationRegistryAddress?: string;
    chainId?: number;
    rpcUrl?: string;
}
export interface AgentRegistration {
    name: string;
    description: string;
    image?: string;
    services: Array<{
        name: string;
        endpoint: string;
        version?: string;
        skills?: string[];
        domains?: string[];
    }>;
    x402Support?: boolean;
    active?: boolean;
    supportedTrust?: string[];
}
export interface AttestationRequest {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: string;
    extracts: Array<{
        key: string;
        path: string;
    }>;
}
export interface AttestationResult {
    requestHash: string;
    taskId: string;
    timestamp: number;
    data: Record<string, any>;
    reportTxHash: string;
}
export interface FeedbackData {
    value: number;
    valueDecimals?: number;
    tag1?: string;
    tag2?: string;
    endpoint?: string;
    feedbackURI?: string;
    feedbackHash?: string;
}
export interface ReputationSummary {
    count: number;
    averageValue: number;
    decimals: number;
}
export declare class VeritasSDK {
    private provider;
    private signer;
    private network;
    private chainId;
    identityRegistry: ethers.Contract;
    reputationRegistry: ethers.Contract;
    validationRegistry: ethers.Contract;
    private primusNetwork;
    private walletAddress;
    private primusAppId;
    private primusAppSecret;
    constructor(config: VeritasConfig);
    initialize(): Promise<void>;
    registerAgent(agent: AgentRegistration): Promise<number>;
    getAgentOwner(agentId: number): Promise<string>;
    isAgentOwner(agentId: number, address?: string): Promise<boolean>;
    giveFeedback(agentId: number, feedback: FeedbackData): Promise<ethers.ContractTransaction>;
    getReputationSummary(agentId: number, clientAddresses: string[], tag1?: string, tag2?: string): Promise<ReputationSummary>;
    /**
     * Generate attestation using Primus Network SDK then submit to contract
     * with 3 on-chain verification checks
     */
    generateAndSubmitAttestation(agentId: number, request: AttestationRequest): Promise<{
        attestation: AttestationResult;
        verification: {
            check2: boolean;
            check3: boolean;
            check4: boolean;
            overall: boolean;
        };
        tx: ethers.ContractReceipt;
    }>;
    /**
     * Verify attestation parameters on-chain before submitting
     */
    verifyAttestationOnChain(apiUrl: string, data: string, timestamp: number): Promise<{
        check2: boolean;
        check3: boolean;
        check4: boolean;
        overall: boolean;
    }>;
    /**
     * Get list of allowed APIs from contract
     */
    getAllowedApis(): Promise<string[]>;
    /**
     * Get list of required data keys from contract
     */
    getRequiredDataKeys(): Promise<string[]>;
    /**
     * Check if API is allowed
     */
    isApiAllowed(api: string): Promise<boolean>;
    /**
     * Get agent attestations
     */
    getAgentAttestations(agentId: number): Promise<string[]>;
    /**
     * Get attestation details
     */
    getAttestation(requestHash: string): Promise<{
        proofHash: string;
        reportTxHash: string;
        apiEndpoint: string;
        timestamp: number;
        attestor: string;
        verified: boolean;
    }>;
    verifyMoltbookOwnership(agentId: number, moltbookName: string): Promise<{
        result: {
            check2: boolean;
            check3: boolean;
            check4: boolean;
            overall: boolean;
        };
        attestation: AttestationResult;
        ownerMatch: boolean;
        extractedOwner: string;
    }>;
}
export { PrimusAttestationVerifier, AttestationVerificationResult, AttestationVerificationConfig };
export default VeritasSDK;
//# sourceMappingURL=sdk-v2.d.ts.map