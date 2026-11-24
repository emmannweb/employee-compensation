import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { Module } from '@nestjs/common';
import { ApplyCompensationUseCase } from './use-cases/apply-compensation.use-case';
import { CreateEmployeeUseCase } from './use-cases/create-employee.use-case';
import { FindEmployeesUseCase } from './use-cases/find-employees.use-case';
import { FindEmployeeByIdUseCase } from './use-cases/find-employee-by-id.use-case';

@Module({
  imports: [InfrastructureModule],
  providers: [ApplyCompensationUseCase, CreateEmployeeUseCase, FindEmployeesUseCase, FindEmployeeByIdUseCase],
  exports: [ApplyCompensationUseCase, CreateEmployeeUseCase, FindEmployeesUseCase, FindEmployeeByIdUseCase],
})
export class ApplicationModule {}
