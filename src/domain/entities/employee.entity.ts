import { randomUUID } from 'node:crypto';
import { BirthDate } from '@domain/value-objects/birth-date.vo';
import { Compensation } from './compensation.entity';
import { ContractDate } from '@domain/value-objects/contract-date.vo';
import { Address } from '@domain/value-objects/address.vo';
import { EmployeeCreatedEvent } from '@domain/events/employee-created.event';
import { CompensationAppliedEvent } from '@domain/events/compensation-applied.event';
import { CompensationType } from '@domain/enums/compensation-type.enum';
import { Money } from '@domain/value-objects/money.vo';

export class Employee {
  private domainEvents: (EmployeeCreatedEvent | CompensationAppliedEvent)[] = [];
  private compensations: Compensation[] = [];

  private constructor(
    private name: string,
    private email: string,
    private birthDate: BirthDate,
    private contractDate: ContractDate,
    private profession: string,
    private address: Address,
    public readonly id: string = randomUUID(),
    compensations: Compensation[] = [],
  ) {
    this.name = name;
    this.email = email;
    this.birthDate = birthDate;
    this.contractDate = contractDate;
    this.profession = profession;
    this.address = address;
    this.compensations = compensations;
  }

  public static create(name: string, email: string, birthDate: BirthDate, contractDate: ContractDate, profession: string, address: Address): Employee {
    const employee = new Employee(name, email, birthDate, contractDate, profession, address);
    employee.domainEvents.push(new EmployeeCreatedEvent(employee.getId(), email));
    return employee;
  }

  public static fromPersistence(
    id: string,
    name: string,
    email: string,
    birthDate: BirthDate,
    contractDate: ContractDate,
    profession: string,
    address: Address,
    compensations: Compensation[],
  ): Employee {
    return new Employee(name, email, birthDate, contractDate, profession, address, id, compensations);
  }

  public addOrUpdateCompensation(type: CompensationType, amount: Money, effectiveDate: Date): void {
    const existing = this.compensations.find(c => c.getType() === type);
    if (existing) {
      existing.updateAmount(amount);
    } else {
      this.compensations.push(Compensation.create(type, amount, effectiveDate));
    }
    this.domainEvents.push(new CompensationAppliedEvent(this.id, type, amount));
  }

  public pullDomainEvents(): (EmployeeCreatedEvent | CompensationAppliedEvent)[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  public getId(): string {
    return this.id;
  }
  public getName() {
    return this.name;
  }
  public getEmail() {
    return this.email;
  }
  public getBirthDate() {
    return this.birthDate;
  }
  public getContractDate() {
    return this.contractDate;
  }
  public getProfession() {
    return this.profession;
  }
  public getAddress() {
    return this.address;
  }
  public getCompensations() {
    return [...this.compensations];
  }
}
