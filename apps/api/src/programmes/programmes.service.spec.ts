import { BadRequestException } from '@nestjs/common';
import { CounterpartyType } from '@prisma/client';
import { ProgrammesService } from './programmes.service';

function buildService() {
  const prisma = {
    counterparty: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'anchor-1',
        type: CounterpartyType.ANCHOR,
      }),
    },
    programme: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'programme-1',
        name: 'Programme',
        code: 'PRG',
        anchorId: 'anchor-1',
        anchor: { contactEmail: 'anchor@example.com' },
        participants: [],
      }),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'programme-1', ...data }),
      ),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const notifications = {
    createLifecycleEmail: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  };
  return {
    service: new ProgrammesService(
      prisma as never,
      audit as never,
      notifications as never,
    ),
    prisma,
  };
}

describe('ProgrammesService', () => {
  it('allows programme edits to include a valid anchorId', async () => {
    const { service, prisma } = buildService();

    await service.update('programme-1', {
      anchorId: 'anchor-1',
      programmeLimit: 100000,
      supplierLimit: 75000,
      anchorLimit: 125000,
      annualDiscountRate: 0.24,
    });

    expect(prisma.programme.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          anchorId: 'anchor-1',
          programmeLimit: 100000,
          supplierLimit: 75000,
          anchorLimit: 125000,
        }),
      }),
    );
  });

  it('rejects programme edits with a non-anchor anchorId', async () => {
    const { service, prisma } = buildService();
    prisma.counterparty.findUnique.mockResolvedValueOnce({
      id: 'supplier-1',
      type: CounterpartyType.SUPPLIER,
    });

    await expect(
      service.update('programme-1', { anchorId: 'supplier-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.programme.update).not.toHaveBeenCalled();
  });
});
