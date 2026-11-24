import { randomUUID } from 'node:crypto';
import { CompensationType } from '@domain/enums/compensation-type.enum';
import { Money } from '@domain/value-objects/money.vo';

export class Compensation {
  private constructor(
    private readonly type: CompensationType,
    private amount: Money,
    private readonly effectiveDate: Date,
    private readonly id: string = randomUUID(),
  ) {}

  public static create(type: CompensationType, amount: Money, effectiveDate: Date): Compensation {
    return new Compensation(type, amount, effectiveDate);
  }

  public static fromPersistence(id: string, type: CompensationType, amount: Money, effectiveDate: Date): Compensation {
    return new Compensation(type, amount, effectiveDate, id);
  }

  public updateAmount(newAmount: Money): void {
    this.amount = newAmount;
  }

  public getId() {
    return this.id;
  }
  public getType() {
    return this.type;
  }
  public getAmount() {
    return this.amount;
  }
  public getEffectiveDate() {
    return this.effectiveDate;
  }
}
