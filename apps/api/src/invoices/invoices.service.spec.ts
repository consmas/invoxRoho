import { BadRequestException } from '@nestjs/common';
import { CounterpartyType, InvoiceStatus } from '@prisma/client';
import { InvoicesService } from './invoices.service';

function buildService() {
  const invoice = {
    id: 'invoice-1',
    programmeId: 'programme-1',
    buyerId: 'buyer-1',
    supplierId: 'supplier-1',
    invoiceNumber: 'INV-1',
    status: InvoiceStatus.RECEIVED,
    programme: { id: 'programme-1', anchorId: 'buyer-1' },
    buyer: { id: 'buyer-1', type: CounterpartyType.ANCHOR },
    supplier: { id: 'supplier-1', type: CounterpartyType.SUPPLIER },
  };
  const prisma = {
    invoice: {
      findUnique: jest.fn().mockResolvedValue(invoice),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...invoice, ...data }),
      ),
    },
    programme: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'programme-1',
        anchorId: 'buyer-1',
      }),
    },
    counterparty: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === 'buyer-1'
            ? { id: 'buyer-1', type: CounterpartyType.ANCHOR }
            : { id: 'supplier-1', type: CounterpartyType.SUPPLIER },
        ),
      ),
    },
    programmeParticipant: {
      findUnique: jest.fn().mockResolvedValue({
        programmeId: 'programme-1',
        counterpartyId: 'supplier-1',
        participantType: CounterpartyType.SUPPLIER,
        isActive: true,
      }),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const notifications = {
    createLifecycleEmail: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  };
  return {
    service: new InvoicesService(
      prisma as never,
      audit as never,
      notifications as never,
    ),
    prisma,
  };
}

describe('InvoicesService', () => {
  it('allows invoice edits to include valid relation ids', async () => {
    const { service, prisma } = buildService();

    await service.update('invoice-1', {
      programmeId: 'programme-1',
      buyerId: 'buyer-1',
      supplierId: 'supplier-1',
      amount: 50000,
      dueDate: '2026-09-01T00:00:00.000Z',
    });

    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          programmeId: 'programme-1',
          buyerId: 'buyer-1',
          supplierId: 'supplier-1',
          amount: 50000,
          dueDate: expect.any(Date),
        }),
      }),
    );
  });

  it('rejects invoice edits when the supplier is not active on the programme', async () => {
    const { service, prisma } = buildService();
    prisma.programmeParticipant.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.update('invoice-1', {
        programmeId: 'programme-1',
        buyerId: 'buyer-1',
        supplierId: 'supplier-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });
});
