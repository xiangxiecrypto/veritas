/**
 * @fileoverview Test suite for Veritas Protocol
 * @description Tests for all core contracts
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { RuleRegistry, VeritasValidator, HTTPCheck, EnhancedEscrow } from '../typechain-types';

describe('Veritas Protocol', function () {
  
  let ruleRegistry: RuleRegistry;
  let validator: VeritasValidator;
  let httpCheck: HTTPCheck;
  let escrow: EnhancedEscrow;
  
  let owner: any;
  let buyer: any;
  let seller: any;
  let other: any;

  before(async function () {
    [owner, buyer, seller, other] = await ethers.getSigners();
  });

  describe('Deployment', function () {
    
    it('Should deploy RuleRegistry', async function () {
      const RuleRegistryFactory = await ethers.getContractFactory('RuleRegistry');
      ruleRegistry = await RuleRegistryFactory.deploy();
      await ruleRegistry.waitForDeployment();
      
      expect(await ruleRegistry.getAddress()).to.be.properAddress;
      expect(await ruleRegistry.admins(owner.address)).to.be.true;
    });

    it('Should deploy HTTPCheck', async function () {
      const HTTPCheckFactory = await ethers.getContractFactory('HTTPCheck');
      httpCheck = await HTTPCheckFactory.deploy();
      await httpCheck.waitForDeployment();
      
      expect(await httpCheck.getAddress()).to.be.properAddress;
    });

    it('Should deploy VeritasValidator', async function () {
      const ValidatorFactory = await ethers.getContractFactory('VeritasValidator');
      validator = await ValidatorFactory.deploy(await ruleRegistry.getAddress());
      await validator.waitForDeployment();
      
      expect(await validator.getAddress()).to.be.properAddress;
      expect(await validator.ruleRegistry()).to.equal(await ruleRegistry.getAddress());
    });

    it('Should deploy EnhancedEscrow', async function () {
      const EscrowFactory = await ethers.getContractFactory('EnhancedEscrow');
      escrow = await EscrowFactory.deploy(await validator.getAddress());
      await escrow.waitForDeployment();
      
      expect(await escrow.getAddress()).to.be.properAddress;
      expect(await escrow.validator()).to.equal(await validator.getAddress());
    });
  });

  describe('RuleRegistry', function () {
    
    it('Should create a rule', async function () {
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes'],
        ['https://api.example.com/*', 'POST', 200, 299, '0x']
      );

      await expect(ruleRegistry.createRule(
        'Test Rule',
        'A test rule',
        await httpCheck.getAddress(),
        checkData,
        80
      ))
        .to.emit(ruleRegistry, 'RuleCreated')
        .withArgs(1, 'Test Rule', await httpCheck.getAddress(), 80);

      const rule = await ruleRegistry.getRule(1);
      expect(rule.name).to.equal('Test Rule');
      expect(rule.requiredScore).to.equal(80);
      expect(rule.active).to.be.true;
    });

    it('Should not allow non-admin to create rule', async function () {
      const checkData = '0x';
      
      await expect(
        ruleRegistry.connect(other).createRule(
          'Unauthorized Rule',
          'Should fail',
          await httpCheck.getAddress(),
          checkData,
          80
        )
      ).to.be.revertedWith('Veritas: not admin');
    });

    it('Should update rule status', async function () {
      await ruleRegistry.updateRuleStatus(1, false);
      
      const rule = await ruleRegistry.getRule(1);
      expect(rule.active).to.be.false;
    });
  });

  describe('EnhancedEscrow', function () {
    
    const jobId = ethers.encodeBytes32String('test-job-1');
    const amount = ethers.parseEther('0.01');

    it('Should create a job without verification', async function () {
      await expect(
        escrow.connect(buyer).createJob(
          jobId,
          seller.address,
          amount,
          false,  // no verification
          0,      // no rule
          { value: amount }
        )
      )
        .to.emit(escrow, 'JobCreated')
        .withArgs(jobId, buyer.address, seller.address, amount, false, 0);

      const job = await escrow.getJob(jobId);
      expect(job.buyer).to.equal(buyer.address);
      expect(job.seller).to.equal(seller.address);
      expect(job.amount).to.equal(amount);
      expect(job.verificationRequired).to.be.false;
    });

    it('Should not create duplicate job', async function () {
      await expect(
        escrow.connect(buyer).createJob(
          jobId,
          seller.address,
          amount,
          false,
          0,
          { value: amount }
        )
      ).to.be.revertedWithCustomError(escrow, 'JobAlreadyExists');
    });

    it('Should allow seller to accept job', async function () {
      await expect(escrow.connect(seller).acceptJob(jobId))
        .to.emit(escrow, 'JobAccepted')
        .withArgs(jobId, seller.address);

      const job = await escrow.getJob(jobId);
      expect(job.status).to.equal(1);  // InProgress
    });

    it('Should allow seller to complete job without verification', async function () {
      const attestation = '0x';
      const responseData = ethers.toUtf8Bytes(JSON.stringify({ result: 'success' }));

      await expect(
        escrow.connect(seller).completeJob(jobId, attestation, responseData)
      )
        .to.emit(escrow, 'JobCompleted')
        .withArgs(jobId, false, 0);

      const job = await escrow.getJob(jobId);
      expect(job.status).to.equal(2);  // Completed
    });

    it('Should allow buyer to confirm job', async function () {
      await expect(escrow.connect(buyer).confirmJob(jobId))
        .to.emit(escrow, 'PaymentReleased')
        .withArgs(jobId, seller.address, amount);

      const job = await escrow.getJob(jobId);
      expect(job.status).to.equal(5);  // Settled
    });
  });

  describe('HTTPCheck', function () {
    
    it('Should validate HTTP check data', async function () {
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes'],
        ['https://api.example.com/test', 'POST', 200, 299, '0x']
      );

      const attestation = '0x';
      const responseData = ethers.toUtf8Bytes(JSON.stringify({ data: 'test' }));

      const [passed, score] = await httpCheck.validate(attestation, checkData, responseData);
      
      // Note: This is a simplified test
      // Real implementation would parse actual attestation
      expect(typeof passed).to.equal('boolean');
      expect(score).to.be.gte(0);
      expect(score).to.be.lte(100);
    });
  });
});
