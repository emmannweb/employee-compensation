import { ConnectionModule } from './connection/postgres-connection.module';
import { Module } from '@nestjs/common';
import { EmployeeOrmEntity } from '../persistence/postgres/employee.orm-entity';
import { OutboxOrmEntity } from '../persistence/postgres/outbox.orm-entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompensationOrmEntity } from '@infrastructure/persistence/postgres/compensation.orm-entity';

@Module({
  imports: [ConnectionModule, TypeOrmModule.forFeature([EmployeeOrmEntity, CompensationOrmEntity, OutboxOrmEntity])],
  exports: [ConnectionModule],
})
export class DatabaseModule {}
