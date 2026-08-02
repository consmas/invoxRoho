import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { Phase2ProductsController } from './phase2-products.controller';
import { Phase2ProductsService } from './phase2-products.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [Phase2ProductsController],
  providers: [Phase2ProductsService],
})
export class Phase2ProductsModule {}
