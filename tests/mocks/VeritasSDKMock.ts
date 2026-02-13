/**
 * Mock Veritas SDK for local testing
 * Simulates SDK behavior without requiring blockchain or Primus Network
 */

interface AgentMetadata {
  name: string;
  description: string;
  services: Service[];
  metadata?: Record<string, any>;
}

interface Service {
  name: string;
  endpoint: string;
  protocol?: string;
}

interface AttestationRequest {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  extracts: Extraction[];
}

interface Extraction {
  key: string;
  path: string;
}

interface AttestationResult {
  requestHash: string;
  taskId: string;
  agentId: number;
  response: Record<string, any>;
  timestamp: number;
}

interface MoltbookVerificationResult {
  attestation: AttestationResult;
  ownerMatch: boolean;
  extractedOwner: string;
}

class VeritasSDKMock {
  private agents: Map<number, any> = new Map();
  private attestations: Map<string, any> = new Map();
  private moltbookResponses: Map<string, any> = new Map();
  private agentCounter = 0;
  public signerAddress: string;

  constructor(signerAddress: string = '0x6870aF53284F07f77E2207A8C218A1Bc07a36ee0') {
    this.signerAddress = signerAddress;
  }

  async initialize(): Promise<void> {
    console.log('[MOCK] SDK initialized');
  }

  async registerAgent(metadata: AgentMetadata): Promise<number> {
    this.agentCounter++;
    const agentId = this.agentCounter;
    
    this.agents.set(agentId, {
      id: agentId,
      owner: this.signerAddress,
      name: metadata.name,
      description: metadata.description,
      services: metadata.services,
      metadata: JSON.stringify(metadata.metadata || {}),
      createdAt: Date.now()
    });
    
    console.log(`[MOCK] Agent registered: ${metadata.name} (ID: ${agentId})`);
    return agentId;
  }

  async getAgent(agentId: number): Promise<any | null> {
    return this.agents.get(agentId) || null;
  }

  async generateAttestation(
    agentId: number,
    request: AttestationRequest
  ): Promise<AttestationResult> {
    await new Promise(r => setTimeout(r, 100));
    
    const mockResponse = this.generateMockResponse(request);
    const requestHash = this.generateHash(agentId, request.url);
    
    const attestation: AttestationResult = {
      requestHash,
      taskId: `task-${Date.now()}`,
      agentId,
      response: mockResponse,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    this.attestations.set(requestHash, attestation);
    
    console.log(`[MOCK] Attestation generated: ${requestHash.slice(0, 20)}...`);
    return attestation;
  }

  async verifyAttestation(proofHash: string): Promise<any> {
    const att = this.attestations.get(proofHash);
    if (!att) {
      return { isValid: false, agentId: 0, timestamp: 0, submitter: '' };
    }
    
    return {
      isValid: true,
      agentId: att.agentId,
      response: att.response,
      timestamp: att.timestamp,
      submitter: this.signerAddress
    };
  }

  async verifyMoltbookOwnership(
    agentId: number,
    moltbookName: string
  ): Promise<MoltbookVerificationResult> {
    const moltbookData = this.moltbookResponses.get(moltbookName);
    
    if (!moltbookData) {
      throw new Error(`No mock data for Moltbook agent: ${moltbookName}`);
    }
    
    const extractedOwner = moltbookData.wallet_address;
    const ownerMatch = extractedOwner.toLowerCase() === this.signerAddress.toLowerCase();
    
    const attestation = await this.generateAttestation(agentId, {
      url: `https://www.moltbook.com/api/v1/agents/${moltbookName}`,
      method: 'GET',
      extracts: [{ key: 'wallet_address', path: '$.agent.wallet_address' }]
    });
    
    console.log(`[MOCK] Moltbook verification: ${moltbookName}`);
    console.log(`  - Extracted owner: ${extractedOwner}`);
    console.log(`  - Your wallet: ${this.signerAddress}`);
    console.log(`  - Match: ${ownerMatch ? '✅' : '❌'}`);
    
    return {
      attestation,
      ownerMatch,
      extractedOwner
    };
  }

  mockMoltbookResponse(name: string, data: any): void {
    this.moltbookResponses.set(name, data);
  }

  async updateAgent(agentId: number, metadata: Partial<AgentMetadata>): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    Object.assign(agent, metadata);
    console.log(`[MOCK] Agent ${agentId} updated`);
  }

  async getAgentAttestations(agentId: number): Promise<string[]> {
    const hashes: string[] = [];
    this.attestations.forEach((att, hash) => {
      if (att.agentId === agentId) hashes.push(hash);
    });
    return hashes;
  }

  private generateHash(agentId: number, url: string): string {
    return `0x${Buffer.from(`${agentId}-${url}-${Date.now()}`).toString('hex').slice(0, 64)}`;
  }

  private generateMockResponse(request: AttestationRequest): Record<string, any> {
    const response: Record<string, any> = {};
    
    request.extracts.forEach(extract => {
      if (extract.path.includes('price')) {
        response[extract.key] = (Math.random() * 100000).toFixed(2);
      } else if (extract.path.includes('wallet')) {
        response[extract.key] = this.signerAddress;
      } else if (extract.path.includes('id')) {
        response[extract.key] = `user_${Math.floor(Math.random() * 1000000)}`;
      } else {
        response[extract.key] = `mock_${extract.key}_${Date.now()}`;
      }
    });
    
    return response;
  }
}

module.exports = { VeritasSDKMock };
