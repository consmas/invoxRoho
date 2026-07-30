import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';

export type PricingPayload = {
  invoiceAmount: number;
  annualRate: number;
  offerDate: string;
  invoiceDueDate: string;
  platformFeeFlat: number;
  platformFeePercent: number;
};

export type PricingResponse = {
  invoiceAmount: number;
  daysAccelerated: number;
  discountAmount: number;
  platformFee: number;
  netProceeds: number;
  annualRate: number;
};

@Injectable()
export class EnginesService {
  private readonly logger = new Logger(EnginesService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async calculatePricing(payload: PricingPayload): Promise<PricingResponse> {
    const baseUrl =
      this.config.get<string>('PRICING_ENGINE_URL') ?? 'http://localhost:4001';
    const started = Date.now();
    try {
      const response = await firstValueFrom(
        this.http
          .post<PricingResponse>(`${baseUrl}/pricing/calculate`, payload)
          .pipe(timeout(5000)),
      );
      this.logger.log(
        JSON.stringify({
          engine: 'pricing',
          operation: 'calculate',
          durationMs: Date.now() - started,
          status: 'SUCCESS',
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          engine: 'pricing',
          operation: 'calculate',
          durationMs: Date.now() - started,
          status: 'FAILED',
          message:
            error instanceof Error ? error.message : 'Pricing engine failed',
        }),
      );
      throw error;
    }
  }
}
