import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApprovalsModule } from './approvals/approvals.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CounterpartiesModule } from './counterparties/counterparties.module';
import { DocumentsModule } from './documents/documents.module';
import { EnginesModule } from './engines/engines.module';
import { FinancingModule } from './financing/financing.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OperationsModule } from './operations/operations.module';
import { PaymentsModule } from './payments/payments.module';
import { Phase2ProductsModule } from './phase2-products/phase2-products.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgrammesModule } from './programmes/programmes.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestContextMiddleware } from './common/request-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditModule,
    ApprovalsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CounterpartiesModule,
    ProgrammesModule,
    InvoicesModule,
    EnginesModule,
    IntegrationsModule,
    DocumentsModule,
    NotificationsModule,
    PaymentsModule,
    Phase2ProductsModule,
    WebhooksModule,
    FinancingModule,
    OperationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
