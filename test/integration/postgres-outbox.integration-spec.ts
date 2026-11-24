import { Employee } from '@domain/entities/employee.entity';
import { CompensationType } from '@domain/enums/compensation-type.enum';
import { DomainConflictError } from '@domain/errors/domain.errors';
import { Address } from '@domain/value-objects/address.vo';
import { BirthDate } from '@domain/value-objects/birth-date.vo';
import { ContractDate } from '@domain/value-objects/contract-date.vo';
import { Money } from '@domain/value-objects/money.vo';
import { EventHandlerService } from '@infrastructure/messaging/event-handler.service';
import { OutboxProcessor } from '@infrastructure/messaging/outbox.processor';
import { PostgresEmployeeRepository } from '@infrastructure/persistence/postgres-employee.repository';
import { CompensationOrmEntity } from '@infrastructure/persistence/postgres/compensation.orm-entity';
import { EmployeeOrmEntity } from '@infrastructure/persistence/postgres/employee.orm-entity';
import { OutboxOrmEntity } from '@infrastructure/persistence/postgres/outbox.orm-entity';
import { DataSource, IsNull } from 'typeorm';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL must point to a dedicated PostgreSQL test database before running integration tests.');
}

describe('PostgreSQL employee repository and outbox integration', () => {
  const dataSource = new DataSource({
    type: 'postgres',
    url: testDatabaseUrl,
    entities: [EmployeeOrmEntity, CompensationOrmEntity, OutboxOrmEntity],
    synchronize: true,
    logging: false,
  });
  const repository = new PostgresEmployeeRepository(dataSource);
  const employeeIds: string[] = [];

  beforeAll(async () => {
    await dataSource.initialize();
  });

  beforeEach(async () => {
    await dataSource.getRepository(OutboxOrmEntity).delete({ processedAt: IsNull() });
  });

  afterEach(async () => {
    const outboxRepository = dataSource.getRepository(OutboxOrmEntity);
    for (const id of employeeIds.splice(0)) {
      await outboxRepository.delete({ aggregateId: id });
      await dataSource.getRepository(EmployeeOrmEntity).delete({ id });
    }
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('persists employee and compensation changes with outbox events, then marks events processed', async () => {
    const employee = createEmployee(`outbox-${crypto.randomUUID()}@example.com`);
    employeeIds.push(employee.getId());

    await repository.save(employee);
    employee.addOrUpdateCompensation(CompensationType.BASE_SALARY, new Money(75000), new Date('2026-01-01'));
    await repository.save(employee);

    const storedEmployee = await dataSource.getRepository(EmployeeOrmEntity).findOne({
      where: { id: employee.getId() },
    });
    const storedCompensation = await dataSource.getRepository(CompensationOrmEntity).findOne({
      where: { employeeId: employee.getId() },
    });
    const outboxRepository = dataSource.getRepository(OutboxOrmEntity);
    const messages = await outboxRepository.find({ where: { aggregateId: employee.getId() } });

    expect(storedEmployee?.email).toBe(employee.getEmail());
    expect(Number(storedCompensation?.amount)).toBe(75000);
    expect(storedCompensation?.currency).toBe('USD');
    expect(messages.map(message => message.eventType).sort()).toEqual(['CompensationAppliedEvent', 'EmployeeCreatedEvent']);
    const createdMessage = messages.find(message => message.eventType === 'EmployeeCreatedEvent');
    const compensationMessage = messages.find(message => message.eventType === 'CompensationAppliedEvent');
    expect(createdMessage?.payload).toMatchObject({ employeeId: employee.getId(), email: employee.getEmail() });
    expect(compensationMessage?.payload).toMatchObject({
      employeeId: employee.getId(),
      compensationType: CompensationType.BASE_SALARY,
      newAmount: { amount: 75000, currency: 'USD' },
    });

    const handleEvent = jest.fn().mockResolvedValue(undefined);
    const processor = new OutboxProcessor(dataSource, { handleEvent } as unknown as EventHandlerService);
    await processor.processOutbox();

    const processedMessages = await outboxRepository.find({ where: { aggregateId: employee.getId() } });
    expect(handleEvent).toHaveBeenCalledTimes(2);
    expect(processedMessages.every(message => message.processedAt instanceof Date)).toBe(true);
  });

  it('rolls back the duplicate employee and does not enqueue its created event', async () => {
    const email = `duplicate-${crypto.randomUUID()}@example.com`;
    const original = createEmployee(email);
    const duplicate = createEmployee(email);
    employeeIds.push(original.getId(), duplicate.getId());

    await repository.save(original);

    await expect(repository.save(duplicate)).rejects.toBeInstanceOf(DomainConflictError);

    const duplicateMessages = await dataSource.getRepository(OutboxOrmEntity).find({
      where: { aggregateId: duplicate.getId() },
    });
    expect(duplicateMessages).toHaveLength(0);
    expect(await dataSource.getRepository(EmployeeOrmEntity).count({ where: { email } })).toBe(1);
  });

  it('reclaims a message after its worker lease expires', async () => {
    const employee = createEmployee(`expired-lease-${crypto.randomUUID()}@example.com`);
    employeeIds.push(employee.getId());
    await repository.save(employee);

    const outboxRepository = dataSource.getRepository(OutboxOrmEntity);
    const message = await outboxRepository.findOneByOrFail({ aggregateId: employee.getId() });
    await outboxRepository.update(
      { id: message.id },
      {
        attemptCount: 1,
        leaseOwner: crypto.randomUUID(),
        leaseToken: crypto.randomUUID(),
        leaseUntil: new Date(Date.now() - 1_000),
      },
    );

    const handleEvent = jest.fn().mockResolvedValue(undefined);
    await new OutboxProcessor(dataSource, { handleEvent } as unknown as EventHandlerService).processOutbox();

    const recoveredMessage = await outboxRepository.findOneByOrFail({ id: message.id });
    expect(handleEvent).toHaveBeenCalledTimes(1);
    expect(recoveredMessage.attemptCount).toBe(2);
    expect(recoveredMessage.processedAt).toBeInstanceOf(Date);
    expect(recoveredMessage.leaseToken).toBeNull();
  });

  it('backs off after a failed delivery and can process the message on a later attempt', async () => {
    const employee = createEmployee(`retry-${crypto.randomUUID()}@example.com`);
    employeeIds.push(employee.getId());
    await repository.save(employee);

    const outboxRepository = dataSource.getRepository(OutboxOrmEntity);
    const message = await outboxRepository.findOneByOrFail({ aggregateId: employee.getId() });
    const handleEvent = jest.fn().mockRejectedValueOnce(new Error('Temporary provider failure')).mockResolvedValueOnce(undefined);
    const processor = new OutboxProcessor(dataSource, { handleEvent } as unknown as EventHandlerService);

    await processor.processOutbox();

    const retryMessage = await outboxRepository.findOneByOrFail({ id: message.id });
    expect(retryMessage.attemptCount).toBe(1);
    expect(retryMessage.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(retryMessage.lastError).toContain('Temporary provider failure');
    expect(retryMessage.leaseToken).toBeNull();

    await outboxRepository.update({ id: message.id }, { nextAttemptAt: new Date(Date.now() - 1_000) });
    await processor.processOutbox();

    const processedMessage = await outboxRepository.findOneByOrFail({ id: message.id });
    expect(handleEvent).toHaveBeenCalledTimes(2);
    expect(processedMessage.attemptCount).toBe(2);
    expect(processedMessage.processedAt).toBeInstanceOf(Date);
  });

  it('moves a message to dead letter after the maximum number of attempts', async () => {
    const employee = createEmployee(`dead-letter-${crypto.randomUUID()}@example.com`);
    employeeIds.push(employee.getId());
    await repository.save(employee);

    const outboxRepository = dataSource.getRepository(OutboxOrmEntity);
    const message = await outboxRepository.findOneByOrFail({ aggregateId: employee.getId() });
    await outboxRepository.update({ id: message.id }, { attemptCount: 7, nextAttemptAt: new Date(Date.now() - 1_000) });
    const handleEvent = jest.fn().mockRejectedValue(new Error('Permanent provider failure'));
    const processor = new OutboxProcessor(dataSource, { handleEvent } as unknown as EventHandlerService);

    await processor.processOutbox();
    await processor.processOutbox();

    const deadLetter = await outboxRepository.findOneByOrFail({ id: message.id });
    expect(handleEvent).toHaveBeenCalledTimes(1);
    expect(deadLetter.attemptCount).toBe(8);
    expect(deadLetter.deadLetteredAt).toBeInstanceOf(Date);
    expect(deadLetter.processedAt).toBeNull();
    expect(deadLetter.leaseToken).toBeNull();
  });

  it('does not let a second worker claim a message while its lease is active', async () => {
    const employee = createEmployee(`concurrent-${crypto.randomUUID()}@example.com`);
    employeeIds.push(employee.getId());
    await repository.save(employee);

    let releaseDelivery!: () => void;
    const blockedDelivery = new Promise<void>(resolve => {
      releaseDelivery = resolve;
    });
    const firstHandler = { handleEvent: jest.fn().mockReturnValue(blockedDelivery) };
    const secondHandler = { handleEvent: jest.fn().mockResolvedValue(undefined) };
    const firstWorker = new OutboxProcessor(dataSource, firstHandler as unknown as EventHandlerService).processOutbox();

    try {
      await waitForCondition(() => firstHandler.handleEvent.mock.calls.length === 1);
      await new OutboxProcessor(dataSource, secondHandler as unknown as EventHandlerService).processOutbox();

      expect(secondHandler.handleEvent).not.toHaveBeenCalled();
    } finally {
      releaseDelivery();
    }

    await firstWorker;
    expect(firstHandler.handleEvent).toHaveBeenCalledTimes(1);
  });
});

async function waitForCondition(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for outbox worker to claim the message.');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

function createEmployee(email: string): Employee {
  return Employee.create(
    'Integration Employee',
    email,
    new BirthDate(`${new Date().getFullYear() - 30}-01-01`),
    new ContractDate('2020-01-01'),
    'Engineer',
    new Address('Main Street', 'Example City', 'Example Country', '12345'),
  );
}
