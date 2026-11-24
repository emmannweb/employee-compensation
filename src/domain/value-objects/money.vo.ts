import { DomainValidationError } from '@domain/errors/domain.errors';

export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'USD',
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new DomainValidationError('Monetary amount must be a positive finite number.');
    }
  }
}
