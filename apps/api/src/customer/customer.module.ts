import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { AuditModule } from '../audit/audit.module';
import {
  CustomerController,
  CustomerSessionGuard,
} from './customer.controller';
import { CustomerBudgetGuard } from './customer-budget.guard';
import { CustomerService } from './customer.service';

@Module({
  imports: [BookingsModule, AuditModule],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerSessionGuard, CustomerBudgetGuard],
})
export class CustomerModule {}
