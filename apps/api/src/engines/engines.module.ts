import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnginesService } from './engines.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [EnginesService],
  exports: [EnginesService],
})
export class EnginesModule {}
