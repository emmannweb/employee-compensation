import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { DataSource } from 'typeorm';
import { EmployeeOrmEntity } from '../persistence/postgres/employee.orm-entity';
import { CompensationType } from '@domain/enums/compensation-type.enum';

export interface EventHandler {
  handle(eventData: unknown, eventType: string): Promise<void>;
}

interface EmployeeCreatedEventData {
  employeeId: string;
  email: string;
}

interface CompensationAppliedEventData {
  employeeId: string;
  compensationType: CompensationType;
  newAmount: {
    amount: number;
    currency: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEmployeeCreatedEventData(eventData: unknown): eventData is EmployeeCreatedEventData {
  return isRecord(eventData) && typeof eventData.employeeId === 'string' && typeof eventData.email === 'string';
}

function isCompensationAppliedEventData(eventData: unknown): eventData is CompensationAppliedEventData {
  if (!isRecord(eventData) || !isRecord(eventData.newAmount)) {
    return false;
  }

  const compensationType = eventData.compensationType;
  return (
    typeof eventData.employeeId === 'string' &&
    Object.values(CompensationType).some(value => value === compensationType) &&
    typeof eventData.newAmount.amount === 'number' &&
    typeof eventData.newAmount.currency === 'string'
  );
}

@Injectable()
export class EventHandlerService {
  private readonly logger = new Logger(EventHandlerService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
  ) {}

  async handleEvent(eventData: unknown, eventType: string): Promise<void> {
    try {
      if (eventType === 'CompensationAppliedEvent') {
        if (!isCompensationAppliedEventData(eventData)) {
          throw new Error('Invalid payload for CompensationAppliedEvent');
        }
        await this.handleCompensationApplied(eventData);
      } else if (eventType === 'EmployeeCreatedEvent') {
        if (!isEmployeeCreatedEventData(eventData)) {
          throw new Error('Invalid payload for EmployeeCreatedEvent');
        }
        await this.handleEmployeeCreated(eventData);
      } else {
        this.logger.warn(`Unhandled event type: ${eventType}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to handle event ${eventType}: ${message}`);
      throw new Error(`Event handling failed: ${message}`);
    }
  }

  private async handleCompensationApplied(eventData: CompensationAppliedEventData): Promise<void> {
    const employeeId = eventData.employeeId;

    const employee = await this.dataSource.getRepository(EmployeeOrmEntity).findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      this.logger.warn(`Employee not found for ID: ${employeeId}`);
      return;
    }

    await this.emailService.sendEmail({
      to: employee.email,
      subject: 'Your Compensation Has Been Updated',
      body: `Your ${eventData.compensationType} compensation has been updated to ${eventData.newAmount.amount} ${eventData.newAmount.currency}.`,
    });
  }

  private async handleEmployeeCreated(eventData: EmployeeCreatedEventData): Promise<void> {
    await this.emailService.sendEmail({
      to: eventData.email,
      subject: 'Welcome to the Company!',
      body: `Your employee profile has been successfully created.`,
    });
  }
}
