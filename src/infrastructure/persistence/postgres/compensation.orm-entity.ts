import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { EmployeeOrmEntity } from './employee.orm-entity';
import { CompensationType } from '@domain/enums/compensation-type.enum';

@Entity('compensations')
export class CompensationOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Column({ length: 50 }) type!: CompensationType;
  @Column('decimal', { precision: 12, scale: 2 }) amount!: number;
  @Column({ length: 3, default: 'USD' }) currency!: string;
  @Column({ name: 'effective_date', type: 'timestamp' }) effectiveDate!: Date;

  @Column({ name: 'employee_id', type: 'uuid' })
  @Index('idx_compensation_employee_id')
  employeeId!: string;

  @ManyToOne(() => EmployeeOrmEntity, e => e.compensations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeOrmEntity;
}
