import { Employee } from '@domain/entities/employee.entity';
import { EmployeeOrmEntity } from '../postgres/employee.orm-entity';
import { Compensation } from '@domain/entities/compensation.entity';
import { Address } from '@domain/value-objects/address.vo';
import { ContractDate } from '@domain/value-objects/contract-date.vo';
import { BirthDate } from '@domain/value-objects/birth-date.vo';
import { Money } from '@domain/value-objects/money.vo';
import { CompensationOrmEntity } from '../postgres/compensation.orm-entity';

export class EmployeeMapper {
  public static toDomain(orm: EmployeeOrmEntity): Employee {
    const compensations = orm.compensations.map(c => Compensation.fromPersistence(c.id, c.type, new Money(Number(c.amount), c.currency), c.effectiveDate));
    return Employee.fromPersistence(
      orm.id,
      orm.name,
      orm.email,
      new BirthDate(orm.birthDate),
      new ContractDate(orm.contractDate),
      orm.profession,
      new Address(orm.addressStreet, orm.addressCity, orm.addressCountry, orm.addressZipCode),
      compensations,
    );
  }

  public static toPersistence(domain: Employee): EmployeeOrmEntity {
    const orm = new EmployeeOrmEntity();
    orm.id = domain.getId();
    orm.name = domain.getName();
    orm.email = domain.getEmail();
    orm.birthDate = domain.getBirthDate().value;
    orm.contractDate = domain.getContractDate().value;
    orm.profession = domain.getProfession();

    const addr = domain.getAddress();
    orm.addressStreet = addr.street;
    orm.addressCity = addr.city;
    orm.addressCountry = addr.country;
    orm.addressZipCode = addr.zipCode;

    orm.compensations = domain.getCompensations().map(c => {
      const compOrm = new CompensationOrmEntity();
      compOrm.id = c.getId();
      compOrm.type = c.getType();
      compOrm.amount = c.getAmount().amount;
      compOrm.currency = c.getAmount().currency;
      compOrm.effectiveDate = c.getEffectiveDate();
      compOrm.employeeId = domain.getId();
      return compOrm;
    });
    return orm;
  }
}
