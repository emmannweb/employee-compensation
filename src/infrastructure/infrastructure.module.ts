import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { PostgresEmployeeRepository } from './persistence/postgres-employee.repository';
import { OutboxProcessor } from './messaging/outbox.processor';
import { EmailService } from './messaging/email.service';
import { EventHandlerService } from './messaging/event-handler.service';
import { EMPLOYEE_REPOSITORY } from '@domain/tokens/employee.repository.token';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: EMPLOYEE_REPOSITORY,
      useClass: PostgresEmployeeRepository,
    },
    OutboxProcessor,
    EmailService,
    EventHandlerService,
  ],
  exports: [EMPLOYEE_REPOSITORY],
})
export class InfrastructureModule {}
