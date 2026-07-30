import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions';
import { UpdateFinancingDto } from './dto/update-financing.dto';
import { FinancingService } from './financing.service';

@Controller('financing')
export class FinancingController {
  constructor(private readonly financing: FinancingService) {}

  @RequirePermissions(PERMISSIONS.financingOfferGenerate)
  @Post('offers/from-invoice/:invoiceId')
  createOfferFromInvoice(@Param('invoiceId') invoiceId: string) {
    return this.financing.createOfferFromInvoice(invoiceId);
  }

  @RequirePermissions(PERMISSIONS.financingOfferAccept)
  @Post(':id/accept')
  accept(@Param('id') id: string) {
    return this.financing.accept(id);
  }

  @RequirePermissions(PERMISSIONS.fundingAllocate)
  @Post(':id/fund')
  fund(@Param('id') id: string) {
    return this.financing.fund(id);
  }

  @RequirePermissions(PERMISSIONS.paymentDisburse)
  @Post(':id/disburse')
  disburse(@Param('id') id: string) {
    return this.financing.disburse(id);
  }

  @RequirePermissions(PERMISSIONS.financingMarkDisbursed)
  @Post(':id/mark-disbursed')
  markDisbursed(@Param('id') id: string) {
    return this.financing.disburse(id);
  }

  @RequirePermissions(PERMISSIONS.collectionManage)
  @Post(':id/collect')
  collect(@Param('id') id: string) {
    return this.financing.collect(id);
  }

  @RequirePermissions(PERMISSIONS.financingMarkCollected)
  @Post(':id/mark-collected')
  markCollected(@Param('id') id: string) {
    return this.financing.collect(id);
  }

  @RequirePermissions(PERMISSIONS.financingClose)
  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.financing.close(id);
  }

  @RequirePermissions(PERMISSIONS.financingRead)
  @Get()
  findAll() {
    return this.financing.findAll();
  }

  @RequirePermissions(PERMISSIONS.financingRead)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.financing.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.financingUpdate)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFinancingDto) {
    return this.financing.update(id, dto);
  }

  @RequirePermissions(PERMISSIONS.financingDelete)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.financing.remove(id);
  }
}
