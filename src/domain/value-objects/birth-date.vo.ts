import { DomainValidationError } from '@domain/errors/domain.errors';

export class BirthDate {
  constructor(public readonly value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new DomainValidationError('Birth date must use YYYY-MM-DD format.');
    }

    const [, yearString, monthString, dayString] = match;
    const year = Number(yearString);
    const month = Number(monthString);
    const day = Number(dayString);
    const daysInMonth = [31, this.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
      throw new DomainValidationError('Birth date must be a valid calendar date.');
    }

    const now = new Date();
    let age = now.getFullYear() - year;
    if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) {
      age--;
    }

    if (age < 18) throw new DomainValidationError('Employee must be at least 18 years old.');
  }

  private isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
}
