import { ApplicationModule } from '@application/application.module';
import { Module } from '@nestjs/common';
import { EmployeeController } from './controllers/employee.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [EmployeeController],
})
export class PresentationModule {}
