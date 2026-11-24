import { Money } from '@domain/value-objects/money.vo';
import { CompensationType } from '@domain/enums/compensation-type.enum';

export class CompensationAppliedEvent {
  constructor(
    public readonly employeeId: string,
    public readonly compensationType: CompensationType,
    public readonly newAmount: Money,
  ) {}
}
