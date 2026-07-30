import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnboardingStatus } from '@prisma/client';
import { CounterpartiesService } from './counterparties/counterparties.service';
import { ComplianceService } from './integrations/compliance/compliance.service';
import { MockKybProvider } from './integrations/compliance/providers/mock-kyb.provider';
import { MockKycProvider } from './integrations/compliance/providers/mock-kyc.provider';
import { MockScreeningProvider } from './integrations/compliance/providers/mock-screening.provider';

const config = (values: Record<string, string> = {}) =>
  new ConfigService(values, { skipProcessEnv: true });

describe('Stage 8C compliance verification layer', () => {
  it('normalizes mock KYB, KYC and screening provider results', async () => {
    const kyb = new MockKybProvider();
    await expect(
      kyb.verifyBusiness({ legalName: 'Acme Ltd', registrationNumber: 'REG' }),
    ).resolves.toMatchObject({ normalizedResult: 'VERIFIED' });
    await expect(
      kyb.verifyBusiness({ legalName: 'FAIL Ltd' }),
    ).resolves.toMatchObject({ normalizedResult: 'FAILED' });
    await expect(
      kyb.verifyBusiness({
        legalName: 'Review Ltd',
        registrationNumber: 'REVIEW-1',
      }),
    ).resolves.toMatchObject({
      normalizedResult: 'REFERRED',
      reviewRequired: true,
    });

    const kyc = new MockKycProvider();
    await expect(
      kyc.verifyPerson({ fullName: 'Jane Doe' }),
    ).resolves.toMatchObject({ normalizedResult: 'VERIFIED' });

    const screening = new MockScreeningProvider();
    await expect(
      screening.screenBusiness({ name: 'Clear Supplier' }),
    ).resolves.toMatchObject({ normalizedResult: 'CLEAR' });
    await expect(
      screening.screenBusiness({ name: 'SANCTION Supplier' }),
    ).resolves.toMatchObject({
      normalizedResult: 'MATCH',
      riskLevel: 'CRITICAL',
    });
    await expect(
      screening.screenPerson({ name: 'PEP Person' }),
    ).resolves.toMatchObject({ normalizedResult: 'MATCH', riskLevel: 'HIGH' });
    await expect(
      screening.screenPerson({ name: 'ADVERSE Person' }),
    ).resolves.toMatchObject({
      normalizedResult: 'MATCH',
      riskLevel: 'MEDIUM',
    });
  });

  it('creates compliance checks, integration logs, audit logs and workflow task on screening match', async () => {
    const prisma = {
      counterparty: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cp-1',
          legalName: 'SANCTION Trading Ltd',
          registrationNumber: 'REG-1',
          country: 'GH',
        }),
        update: jest.fn().mockResolvedValue({ id: 'cp-1' }),
      },
      complianceCheck: {
        create: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve({
              id: `check-${String(data.checkType)}`,
              ...data,
            }),
          ),
      },
      workflowCase: {
        create: jest.fn().mockResolvedValue({ id: 'workflow-1' }),
      },
    };
    const logs = { create: jest.fn().mockResolvedValue({ id: 'log-1' }) };
    const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const notifications = {
      createLifecycleEmail: jest.fn().mockResolvedValue({ id: 'notice-1' }),
    };
    const service = new ComplianceService(
      prisma as never,
      logs as never,
      audit as never,
      notifications as never,
      config(),
    );

    const result = await service.runCounterpartyScreening('cp-1', 'user-1');

    expect(result.checks).toHaveLength(3);
    expect(prisma.complianceCheck.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkType: 'SANCTIONS',
          normalizedResult: 'MATCH',
          reviewRequired: true,
        }) as Record<string, unknown>,
      }) as Record<string, unknown>,
    );
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({ providerType: 'SCREENING' }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'ComplianceCheck' }),
    );
    expect(prisma.workflowCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          caseType: 'COMPLIANCE_REVIEW',
        }) as Record<string, unknown>,
      }) as Record<string, unknown>,
    );
  });

  it('blocks KYC approval with unresolved match and allows after false-positive review', async () => {
    const baseCounterparty = {
      id: 'cp-1',
      onboardingStatus: OnboardingStatus.SUBMITTED,
      uboRecords: [],
    };
    const requiredChecks = [
      check('BUSINESS_VERIFICATION', 'VERIFIED'),
      check('SANCTIONS', 'MATCH'),
      check('PEP', 'CLEAR'),
      check('ADVERSE_MEDIA', 'CLEAR'),
    ];
    const prisma = {
      counterparty: {
        findUnique: jest.fn().mockResolvedValue(baseCounterparty),
        update: jest.fn().mockResolvedValue({
          ...baseCounterparty,
          onboardingStatus: OnboardingStatus.APPROVED,
        }),
      },
      complianceCheck: {
        findMany: jest.fn().mockResolvedValue(requiredChecks),
      },
    };
    const service = new CounterpartiesService(
      prisma as never,
      { log: jest.fn() } as never,
      {
        createLifecycleEmail: jest.fn().mockResolvedValue({ id: 'notice-1' }),
      } as never,
    );

    await expect(service.approveKyc('cp-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.complianceCheck.findMany.mockResolvedValue([
      check('BUSINESS_VERIFICATION', 'VERIFIED'),
      check('SANCTIONS', 'MATCH', 'FALSE_POSITIVE'),
      check('PEP', 'CLEAR'),
      check('ADVERSE_MEDIA', 'CLEAR'),
    ]);
    await expect(service.approveKyc('cp-1', 'user-1')).resolves.toMatchObject({
      onboardingStatus: OnboardingStatus.APPROVED,
    });
  });
});

function check(
  checkType: string,
  normalizedResult: string,
  reviewDecision?: string,
) {
  return {
    id: `${checkType}-${normalizedResult}`,
    checkType,
    normalizedResult,
    status:
      normalizedResult === 'MATCH' && !reviewDecision
        ? 'REVIEW_REQUIRED'
        : 'COMPLETED',
    reviewRequired: normalizedResult === 'MATCH' && !reviewDecision,
    reviewDecision,
    checkedAt: new Date(),
  };
}
