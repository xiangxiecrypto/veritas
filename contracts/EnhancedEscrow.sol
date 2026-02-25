// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVeritasValidator.sol";

/**
 * @title EnhancedEscrow
 * @notice Escrow contract with integrated verification
 * @dev Compatible with Virtuals ACP protocol
 */
contract EnhancedEscrow is ReentrancyGuard, Pausable, Ownable {
    
    IVeritasValidator public validator;
    
    /**
     * @notice Job status enum
     */
    enum JobStatus { 
        Pending,        // Created, waiting for seller to accept
        InProgress,     // Seller accepted, working on it
        Completed,      // Seller submitted result
        Confirmed,      // Buyer confirmed
        Disputed,       // Dispute raised
        Settled,        // Payment released
        Cancelled       // Job cancelled
    }
    
    /**
     * @notice Job struct
     */
    struct Job {
        bytes32 id;
        address buyer;
        address seller;
        uint256 amount;
        JobStatus status;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 completedAt;
        uint256 confirmedAt;
        
        // Verification related
        bool verificationRequired;
        uint256 ruleId;
        bool verificationPassed;
        uint256 verificationScore;
        
        // Result data
        bytes resultData;
    }
    
    // Mapping from job ID to Job
    mapping(bytes32 => Job) public jobs;
    
    // Mapping from seller to job count
    mapping(address => uint256) public sellerJobCount;
    
    // Mapping from buyer to job count
    mapping(address => uint256) public buyerJobCount;
    
    // Events
    event JobCreated(
        bytes32 indexed jobId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        bool verificationRequired,
        uint256 ruleId
    );
    
    event JobAccepted(
        bytes32 indexed jobId,
        address indexed seller
    );
    
    event JobCompleted(
        bytes32 indexed jobId,
        bool verificationPassed,
        uint256 verificationScore
    );
    
    event JobConfirmed(
        bytes32 indexed jobId,
        address indexed buyer
    );
    
    event PaymentReleased(
        bytes32 indexed jobId,
        address indexed seller,
        uint256 amount
    );
    
    event RefundIssued(
        bytes32 indexed jobId,
        address indexed buyer,
        uint256 amount
    );
    
    event JobDisputed(
        bytes32 indexed jobId,
        address indexed disputer,
        string reason
    );
    
    // Errors
    error JobAlreadyExists(bytes32 jobId);
    error JobNotFound(bytes32 jobId);
    error InsufficientFunds(uint256 required, uint256 provided);
    error InvalidStatus(JobStatus current, JobStatus expected);
    error Unauthorized(string reason);
    error VerificationFailed(uint256 score, uint256 required);
    error SLAExceeded(uint256 deadline, uint256 current);
    
    // Constants
    uint256 public constant MAX_SLA_DURATION = 7 days;
    uint256 public constant AUTO_CONFIRM_DELAY = 3 days;
    
    /**
     * @notice Constructor
     * @param _validator Address of the VeritasValidator contract
     */
    constructor(address _validator) {
        require(_validator != address(0), "Escrow: invalid validator");
        validator = IVeritasValidator(_validator);
    }
    
    /**
     * @notice Create a new job
     * @param _jobId Unique job identifier
     * @param _seller Seller address
     * @param _amount Payment amount
     * @param _verificationRequired Whether verification is required
     * @param _ruleId Rule ID for verification (0 if no verification)
     */
    function createJob(
        bytes32 _jobId,
        address _seller,
        uint256 _amount,
        bool _verificationRequired,
        uint256 _ruleId
    ) external payable whenNotPaused {
        
        // Validation
        if (jobs[_jobId].buyer != address(0)) {
            revert JobAlreadyExists(_jobId);
        }
        
        if (msg.value < _amount) {
            revert InsufficientFunds(_amount, msg.value);
        }
        
        if (_seller == address(0)) {
            revert Unauthorized("invalid seller");
        }
        
        // Create job
        jobs[_jobId] = Job({
            id: _jobId,
            buyer: msg.sender,
            seller: _seller,
            amount: _amount,
            status: JobStatus.Pending,
            createdAt: block.timestamp,
            acceptedAt: 0,
            completedAt: 0,
            confirmedAt: 0,
            verificationRequired: _verificationRequired,
            ruleId: _ruleId,
            verificationPassed: false,
            verificationScore: 0,
            resultData: ""
        });
        
        // Update counters
        buyerJobCount[msg.sender]++;
        sellerJobCount[_seller]++;
        
        emit JobCreated(
            _jobId,
            msg.sender,
            _seller,
            _amount,
            _verificationRequired,
            _ruleId
        );
    }
    
    /**
     * @notice Seller accepts the job
     * @param _jobId Job identifier
     */
    function acceptJob(bytes32 _jobId) external whenNotPaused {
        Job storage job = jobs[_jobId];
        
        if (job.buyer == address(0)) {
            revert JobNotFound(_jobId);
        }
        
        if (msg.sender != job.seller) {
            revert Unauthorized("only seller");
        }
        
        if (job.status != JobStatus.Pending) {
            revert InvalidStatus(job.status, JobStatus.Pending);
        }
        
        job.status = JobStatus.InProgress;
        job.acceptedAt = block.timestamp;
        
        emit JobAccepted(_jobId, msg.sender);
    }
    
    /**
     * @notice Complete a job with verification
     * @param _jobId Job identifier
     * @param _attestation Attestation from zktls-core-sdk
     * @param _responseData Response data
     */
    function completeJob(
        bytes32 _jobId,
        bytes calldata _attestation,
        bytes calldata _responseData
    ) external whenNotPaused {
        
        Job storage job = jobs[_jobId];
        
        if (job.buyer == address(0)) {
            revert JobNotFound(_jobId);
        }
        
        if (msg.sender != job.seller) {
            revert Unauthorized("only seller");
        }
        
        if (job.status != JobStatus.InProgress) {
            revert InvalidStatus(job.status, JobStatus.InProgress);
        }
        
        // Verify if required
        if (job.verificationRequired) {
            (bool passed, uint256 score) = validator.validate(
                _jobId,
                job.ruleId,
                _attestation,
                _responseData
            );
            
            job.verificationPassed = passed;
            job.verificationScore = score;
        }
        
        // Update job
        job.status = JobStatus.Completed;
        job.completedAt = block.timestamp;
        job.resultData = _responseData;
        
        emit JobCompleted(
            _jobId,
            job.verificationPassed,
            job.verificationScore
        );
    }
    
    /**
     * @notice Buyer confirms the job
     * @param _jobId Job identifier
     */
    function confirmJob(bytes32 _jobId) external nonReentrant whenNotPaused {
        
        Job storage job = jobs[_jobId];
        
        if (job.buyer == address(0)) {
            revert JobNotFound(_jobId);
        }
        
        if (msg.sender != job.buyer) {
            revert Unauthorized("only buyer");
        }
        
        if (job.status != JobStatus.Completed) {
            revert InvalidStatus(job.status, JobStatus.Completed);
        }
        
        job.status = JobStatus.Confirmed;
        job.confirmedAt = block.timestamp;
        
        // Release payment
        _releasePayment(_jobId);
    }
    
    /**
     * @notice Auto confirm after delay
     * @param _jobId Job identifier
     */
    function autoConfirm(bytes32 _jobId) external nonReentrant whenNotPaused {
        
        Job storage job = jobs[_jobId];
        
        if (job.buyer == address(0)) {
            revert JobNotFound(_jobId);
        }
        
        if (job.status != JobStatus.Completed) {
            revert InvalidStatus(job.status, JobStatus.Completed);
        }
        
        if (block.timestamp < job.completedAt + AUTO_CONFIRM_DELAY) {
            revert("Auto confirm not yet available");
        }
        
        job.status = JobStatus.Confirmed;
        job.confirmedAt = block.timestamp;
        
        // Release payment
        _releasePayment(_jobId);
    }
    
    /**
     * @notice Release payment to seller
     * @param _jobId Job identifier
     */
    function _releasePayment(bytes32 _jobId) internal {
        
        Job storage job = jobs[_jobId];
        
        job.status = JobStatus.Settled;
        
        (bool success, ) = job.seller.call{value: job.amount}("");
        require(success, "Transfer failed");
        
        emit PaymentReleased(_jobId, job.seller, job.amount);
    }
    
    /**
     * @notice Cancel a pending job
     * @param _jobId Job identifier
     */
    function cancelJob(bytes32 _jobId) external whenNotPaused {
        
        Job storage job = jobs[_jobId];
        
        if (job.buyer == address(0)) {
            revert JobNotFound(_jobId);
        }
        
        if (msg.sender != job.buyer && msg.sender != job.seller) {
            revert Unauthorized("only buyer or seller");
        }
        
        if (job.status != JobStatus.Pending) {
            revert InvalidStatus(job.status, JobStatus.Pending);
        }
        
        job.status = JobStatus.Cancelled;
        
        // Refund buyer
        (bool success, ) = job.buyer.call{value: job.amount}("");
        require(success, "Refund failed");
        
        emit RefundIssued(_jobId, job.buyer, job.amount);
    }
    
    /**
     * @notice Raise a dispute
     * @param _jobId Job identifier
     * @param _reason Reason for dispute
     */
    function raiseDispute(
        bytes32 _jobId, 
        string calldata _reason
    ) external whenNotPaused {
        
        Job storage job = jobs[_jobId];
        
        if (job.buyer == address(0)) {
            revert JobNotFound(_jobId);
        }
        
        if (msg.sender != job.buyer && msg.sender != job.seller) {
            revert Unauthorized("only buyer or seller");
        }
        
        if (job.status != JobStatus.Completed) {
            revert InvalidStatus(job.status, JobStatus.Completed);
        }
        
        job.status = JobStatus.Disputed;
        
        emit JobDisputed(_jobId, msg.sender, _reason);
    }
    
    /**
     * @notice Get job details
     * @param _jobId Job identifier
     * @return Job struct
     */
    function getJob(bytes32 _jobId) external view returns (Job memory) {
        return jobs[_jobId];
    }
    
    /**
     * @notice Update validator address
     * @param _validator New validator address
     */
    function setValidator(address _validator) external onlyOwner {
        require(_validator != address(0), "Escrow: invalid validator");
        validator = IVeritasValidator(_validator);
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
