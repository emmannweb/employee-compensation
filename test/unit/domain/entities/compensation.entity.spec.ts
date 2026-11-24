import { Compensation } from '@domain/entities/compensation.entity';
import { CompensationType } from '@domain/enums/compensation-type.enum';
import { DomainValidationError } from '@domain/errors/domain.errors';
import { Money } from '@domain/value-objects/money.vo';

describe('Compensation', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects an invalid monetary amount: %s', amount => {
    expect(() => new Money(amount)).toThrow(DomainValidationError);
  });

  it('generates its own ID when created in the domain', () => {
    const compensation = Compensation.create(CompensationType.BASE_SALARY, new Money(75000), new Date('2026-01-01'));

    expect(compensation.getId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('updates compensation with a valid positive amount', () => {
    const compensation = Compensation.create(CompensationType.BASE_SALARY, new Money(75000), new Date('2026-01-01'));

    compensation.updateAmount(new Money(80000));

    expect(compensation.getAmount()).toEqual(new Money(80000));
  });

  it('preserves the ID when rehydrated from persistence', () => {
    const id = 'a06a98d5-0c66-49f8-a525-7f8ac25612f8';
    const compensation = Compensation.fromPersistence(id, CompensationType.BASE_SALARY, new Money(75000), new Date('2026-01-01'));

    expect(compensation.getId()).toBe(id);
  });
});
