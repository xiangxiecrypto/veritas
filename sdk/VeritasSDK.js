/**
 * @title VeritasSDK
 * @notice Easy-to-use SDK for Veritas validation system
 * @dev Wraps Primus SDK with agent registration and validation helpers
 */

const { ethers } = require('ethers');
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

// Contract ABIs (minimal)
const APP_ABI = [
  "function addRule(string url, string dataKey, string parsePath, uint8 decimals, uint256 maxAge, string description) returns (uint256)",
  "function addCheck(uint256 ruleId, address checkContract, bytes params, int128 score) returns (uint256)",
  "function requestValidation(uint256 agentId, uint256 ruleId, uint256[] checkIds, uint256 attestorCount) payable returns (bytes32)",
  "function ruleCount() view returns (uint256)",
  "function checkCount(uint256 ruleId) view returns (uint256)",
  "function rules(uint256) view returns (string url, string dataKey, string parsePath, uint8 decimals, uint256 maxAge, bool active, string description, bytes32 ruleHash)",
  "event ValidationRequested(bytes32 indexed taskId, uint256 indexed ruleId, uint256 indexed agentId)",
  "event CheckPassed(uint256 indexed ruleId, uint256 indexed checkId, int128 score)",
  "event CheckFailed(uint256 indexed ruleId, uint256 indexed checkId)",
  "event ValidationCompleted(bytes32 indexed taskId, uint8 score)"
];

const IDENTITY_REGISTRY_ABI = [
  "function register(uint256 agentId, address owner)",
  "function ownerOf(uint256 agentId) view returns (address)"
];

const VALIDATION_REGISTRY_ABI = [
  "function getAgentValidations(uint256 agentId) view returns (bytes32[] memory)"
];

/**
 * VeritasSDK - Easy-to-use validation SDK
 */
class VeritasSDK {
  constructor(config) {
    this.config = {
      // Default addresses (Base Sepolia)
      appAddress: config.appAddress || "0xC34E7059e1E891a4c42F9232D0162dCab92Fa0ec",
      identityRegistry: config.identityRegistry || "0x8004A818BFB912233c491871b3d84c89A494BD9e",
      validationRegistry: config.validationRegistry || "0xAeFdE0707014b6540128d3835126b53F073fEd40",
      reputationRegistry: config.reputationRegistry || "0x8004B663056A597Dffe9eCcC1965A193B7388713",
      primusTask: config.primusTask || "0xC02234058caEaA9416506eABf6Ef3122fCA939E8",
      chainId: config.chainId || 84532,
      ...config
    };
    
    this.signer = null;
    this.app = null;
    this.primus = null;
  }

  /**
   * Initialize SDK with signer
   * @param {ethers.Signer} signer - Ethereum signer
   */
  async init(signer) {
    this.signer = signer;
    
    // Initialize contracts
    this.app = new ethers.Contract(this.config.appAddress, APP_ABI, signer);
    this.identityRegistry = new ethers.Contract(this.config.identityRegistry, IDENTITY_REGISTRY_ABI, signer);
    this.validationRegistry = new ethers.Contract(this.config.validationRegistry, VALIDATION_REGISTRY_ABI, signer);
    
    // Initialize Primus SDK
    this.primus = new PrimusNetwork();
    await this.primus.init(signer, this.config.chainId);
    
    return this;
  }

  // ============================================
  // AGENT MANAGEMENT
  // ============================================

  /**
   * Register a new agent
   * @param {number|string} agentId - Agent ID to register
   * @param {string} owner - Owner address (defaults to signer)
   * @returns {Promise<object>} Transaction receipt
   */
  async registerAgent(agentId, owner = null) {
    const ownerAddress = owner || await this.signer.getAddress();
    
    // Check if already registered
    try {
      const existingOwner = await this.identityRegistry.ownerOf(agentId);
      if (existingOwner !== ethers.constants.AddressZero) {
        return { alreadyRegistered: true, owner: existingOwner };
      }
    } catch (e) {
      // Not registered, continue
    }
    
    const tx = await this.identityRegistry.register(agentId, ownerAddress);
    const receipt = await tx.wait();
    
    return {
      success: true,
      agentId,
      owner: ownerAddress,
      txHash: tx.hash
    };
  }

  /**
   * Check if agent is registered
   * @param {number|string} agentId - Agent ID
   * @returns {Promise<object>} Agent info
   */
  async getAgentInfo(agentId) {
    try {
      const owner = await this.identityRegistry.ownerOf(agentId);
      const validations = await this.validationRegistry.getAgentValidations(agentId);
      
      return {
        registered: owner !== ethers.constants.AddressZero,
        owner,
        validationCount: validations.length
      };
    } catch (e) {
      return { registered: false, owner: null, validationCount: 0 };
    }
  }

  // ============================================
  // RULE MANAGEMENT
  // ============================================

  /**
   * Add a new validation rule
   * @param {object} rule - Rule configuration
   * @returns {Promise<object>} Created rule
   */
  async addRule(rule) {
    const tx = await this.app.addRule(
      rule.url,
      rule.dataKey,
      rule.parsePath,
      rule.decimals || 0,
      rule.maxAge || 3600,
      rule.description || ""
    );
    
    const receipt = await tx.wait();
    const ruleId = (await this.app.ruleCount()).toNumber() - 1;
    
    return {
      success: true,
      ruleId,
      txHash: tx.hash,
      ...rule
    };
  }

  /**
   * Get rule by ID
   * @param {number} ruleId - Rule ID
   * @returns {Promise<object>} Rule data
   */
  async getRule(ruleId) {
    const rule = await this.app.rules(ruleId);
    
    return {
      ruleId,
      url: rule.url,
      dataKey: rule.dataKey,
      parsePath: rule.parsePath,
      decimals: rule.decimals,
      maxAge: rule.maxAge.toNumber(),
      active: rule.active,
      description: rule.description
    };
  }

  /**
   * Get all rules
   * @returns {Promise<array>} All rules
   */
  async getAllRules() {
    const count = (await this.app.ruleCount()).toNumber();
    const rules = [];
    
    for (let i = 0; i < count; i++) {
      rules.push(await this.getRule(i));
    }
    
    return rules;
  }

  // ============================================
  // CHECK MANAGEMENT
  // ============================================

  /**
   * Add a check to a rule
   * @param {number} ruleId - Rule ID
   * @param {string} checkAddress - Check contract address
   * @param {number} score - Score for this check
   * @param {bytes} params - Optional parameters
   * @returns {Promise<object>} Created check
   */
  async addCheck(ruleId, checkAddress, score, params = "0x") {
    const tx = await this.app.addCheck(ruleId, checkAddress, params, score);
    const receipt = await tx.wait();
    const checkId = (await this.app.checkCount(ruleId)).toNumber() - 1;
    
    return {
      success: true,
      ruleId,
      checkId,
      checkAddress,
      score,
      txHash: tx.hash
    };
  }

  // ============================================
  // VALIDATION (GENERIC)
  // ============================================

  /**
   * Request validation and run full attestation flow
   * @param {object} options - Validation options
   * @param {number|string} options.agentId - Agent ID
   * @param {number} options.ruleId - Rule ID
   * @param {array} options.checkIds - Check IDs to run (required)
   * @param {number} [options.attestorCount=1] - Number of attestors
   * @param {object} options.request - Request configuration (Primus format)
   * @param {string} options.request.url - URL to attest
   * @param {string} [options.request.method='GET'] - HTTP method
   * @param {object} [options.request.header={}] - HTTP headers
   * @param {string} [options.request.body=''] - Request body
   * @param {array} options.responseResolves - Response resolve config (Primus format)
   * @param {string} [options.fee='0.00000001'] - Fee in ETH
   * @returns {Promise<object>} Validation result
   */
  async validate(options) {
    const {
      agentId,
      ruleId,
      checkIds,  // Required - must be explicit
      attestorCount = 1,
      request,
      responseResolves,
      fee = '0.00000001'
    } = options;

    // Validate required fields
    if (!agentId) throw new Error('agentId is required');
    if (ruleId === undefined) throw new Error('ruleId is required');
    if (!checkIds || checkIds.length === 0) throw new Error('checkIds is required and must not be empty');
    if (!request) throw new Error('request is required');
    if (!responseResolves) throw new Error('responseResolves is required');

    const feeWei = ethers.utils.parseEther(fee);

    // Step 1: Request validation
    console.log(`📝 Requesting validation for agent ${agentId}, rule ${ruleId}...`);
    
    const requestTx = await this.app.requestValidation(
      agentId,
      ruleId,
      checkIds,
      attestorCount,
      { value: feeWei }
    );
    
    const requestReceipt = await requestTx.wait();
    const event = requestReceipt.events.find(e => e.event === 'ValidationRequested');
    const taskId = event.args.taskId;
    
    console.log(`✅ Task created: ${taskId}`);

    // Step 2: Run attestation using Primus SDK format
    console.log(`⏳ Running attestation...`);
    
    // Build Primus attest params
    const attestParams = {
      address: await this.signer.getAddress(),
      taskId: taskId,
      taskTxHash: requestTx.hash,
      taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
      requests: [{
        url: request.url,
        method: request.method || 'GET',
        header: request.header || {},
        body: request.body || ''
      }],
      responseResolves: responseResolves
    };

    const attestResult = await this.primus.attest(attestParams, 120000);

    const data = attestResult[0].attestation.data;
    const timestamp = attestResult[0].attestation.timestamp;
    console.log(`✅ Attestation complete: ${data}`);

    // Step 3: Wait for auto-callback
    const reportTxHash = attestResult[0].reportTxHash;
    
    if (reportTxHash && reportTxHash !== '') {
      console.log(`⏳ Waiting for auto-callback: ${reportTxHash}`);
      
      const receipt = await ethers.provider.waitForTransaction(reportTxHash, 1, 120000);
      
      // Parse events
      let score = 0;
      let normalizedScore = 0;
      let passed = false;
      
      for (const log of receipt.logs) {
        try {
          const parsed = this.app.interface.parseLog({ topics: log.topics, data: log.data });
          
          if (parsed.name === 'CheckPassed') {
            passed = true;
            score = parsed.args.score.toNumber();
          }
          
          if (parsed.name === 'CheckFailed') {
            passed = false;
          }
          
          if (parsed.name === 'ValidationCompleted') {
            normalizedScore = parsed.args.score;
          }
        } catch (e) {}
      }
      
      console.log(`✅ Validation complete! Score: ${score}, Normalized: ${normalizedScore}`);
      
      return {
        success: true,
        taskId,
        requestTxHash: requestTx.hash,
        callbackTxHash: reportTxHash,
        data,
        timestamp,
        score,
        normalizedScore,
        passed
      };
    }
    
    return {
      success: false,
      error: "No reportTxHash returned"
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get validation history for agent
   * @param {number} agentId - Agent ID
   * @returns {Promise<array>} Validation hashes
   */
  async getValidationHistory(agentId) {
    const hashes = await this.validationRegistry.getAgentValidations(agentId);
    return hashes;
  }

  /**
   * Create response resolve config (helper)
   * @param {string} keyName - Key name for the extracted value
   * @param {string} parsePath - JSON path to extract
   * @param {string} [parseType='json'] - Parse type
   * @returns {array} Response resolve array (Primus format)
   */
  static createResponseResolve(keyName, parsePath, parseType = 'json') {
    return [[{
      keyName,
      parseType,
      parsePath
    }]];
  }

  /**
   * Create request config (helper)
   * @param {string} url - URL to request
   * @param {object} [options] - Additional options
   * @returns {object} Request object (Primus format)
   */
  static createRequest(url, options = {}) {
    return {
      url,
      method: options.method || 'GET',
      header: options.header || {},
      body: options.body || ''
    };
  }
}

module.exports = { VeritasSDK };
