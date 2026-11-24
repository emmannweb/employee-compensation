import { Entity, PrimaryColumn, Column, OneToMany, Unique } from 'typeorm';
import { CompensationOrmEntity } from './compensation.orm-entity';

@Entity('employees')
@Unique('UQ_employees_email', ['email'])
export class EmployeeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 150 })
  email!: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate!: string;

  @Column({ name: 'contract_date', type: 'date' })
  contractDate!: string;

  @Column({ length: 100 })
  profession!: string;

  @Column({ name: 'address_street' })
  addressStreet!: string;

  @Column({ name: 'address_city' })
  addressCity!: string;

  @Column({ name: 'address_country' })
  addressCountry!: string;

  @Column({ name: 'address_zip_code' })
  addressZipCode!: string;

  @OneToMany(() => CompensationOrmEntity, c => c.employee, { cascade: true, eager: true })
  compensations!: CompensationOrmEntity[];
}
