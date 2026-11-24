import { OutboxOrmEntity } from '@infrastructure/persistence/postgres/outbox.orm-entity';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventHandlerService } from './event-handler.service';
import { randomUUID } from 'node:crypto';

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 8;
const INITIAL_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;
const LEASE_DURATION_MS = 5 * 60 * 1_000;
const LEASE_RENEWAL_INTERVAL_MS = 30 * 1_000;

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);
  private readonly workerId = randomUUID();

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventHandlerService: EventHandlerService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS, { waitForCompletion: true })
  async processOutbox(): Promise<void> {
    for (let processed = 0; processed < BATCH_SIZE; processed += 1) {
      const [message] = await this.claimMessages();
      if (!message) {
        return;
      }

      try {
        await this.processMessage(message);
      } catch (error: unknown) {
        this.logger.error(`Could not update outbox message ${message.id}: ${this.getErrorSummary(error)}`);
      }
    }
  }

  private async claimMessages(): Promise<OutboxOrmEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 1. Fetch & lock unprocessed outbox messages (deduplicates concurrent workers)
      const messages = await queryRunner.manager
        .getRepository(OutboxOrmEntity)
        .createQueryBuilder('outbox')
        .where('outbox.processed_at IS NULL')
        .andWhere('outbox.dead_lettered_at IS NULL')
        .andWhere('outbox.next_attempt_at <= CURRENT_TIMESTAMP')
        .andWhere('(outbox.lease_until IS NULL OR outbox.lease_until <= CURRENT_TIMESTAMP)')
        .orderBy('outbox.created_at', 'ASC')
        .limit(1)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      const leaseUntil = new Date(Date.now() + LEASE_DURATION_MS);
      for (const message of messages) {
        message.leaseOwner = this.workerId;
        message.leaseToken = randomUUID();
        message.leaseUntil = leaseUntil;
        message.attemptCount += 1;
      }

      if (messages.length > 0) {
        await queryRunner.manager.save(OutboxOrmEntity, messages);
      }
      await queryRunner.commitTransaction();
      return messages;
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async processMessage(message: OutboxOrmEntity): Promise<void> {
    const leaseToken = message.leaseToken;
    if (!leaseToken) {
      throw new Error(`Claimed outbox message ${message.id} has no lease token.`);
    }

    const heartbeat = this.startLeaseRenewal(message, leaseToken);

    try {
      let deliveryFailed = false;
      let deliveryError: unknown;
      try {
        const eventData: unknown = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
        // Email delivery and database acknowledgement cannot be atomic, so retries provide at-least-once delivery.
        await this.eventHandlerService.handleEvent(eventData, message.eventType);
      } catch (error: unknown) {
        deliveryFailed = true;
        deliveryError = error;
      }

      await heartbeat.stop();
      if (deliveryFailed) {
        await this.scheduleRetry(message, leaseToken, this.getErrorSummary(deliveryError));
        return;
      }

      const result = await this.dataSource.getRepository(OutboxOrmEntity).update(
        {
          id: message.id,
          processedAt: IsNull(),
          deadLetteredAt: IsNull(),
          leaseToken,
        },
        {
          processedAt: new Date(),
          leaseOwner: null,
          leaseToken: null,
          leaseUntil: null,
          lastError: null,
        },
      );

      if (result.affected !== 1) {
        this.logger.warn(`Outbox message ${message.id} was delivered, but its lease was no longer owned by this worker.`);
      }
    } finally {
      await heartbeat.stop();
    }
  }

  private startLeaseRenewal(message: OutboxOrmEntity, leaseToken: string): { stop: () => Promise<void> } {
    let stopped = false;
    let renewalInProgress = false;
    let pendingRenewal: Promise<void> = Promise.resolve();
    const timer = setInterval(() => {
      if (stopped || renewalInProgress) {
        return;
      }

      renewalInProgress = true;
      pendingRenewal = this.dataSource
        .getRepository(OutboxOrmEntity)
        .update(
          {
            id: message.id,
            processedAt: IsNull(),
            deadLetteredAt: IsNull(),
            leaseToken,
          },
          { leaseUntil: new Date(Date.now() + LEASE_DURATION_MS) },
        )
        .then(result => {
          if (result.affected !== 1) {
            this.logger.warn(`Lease renewal failed for outbox message ${message.id}; another worker may have claimed it.`);
          }
        })
        .catch((error: unknown) => {
          this.logger.error(`Could not renew lease for outbox message ${message.id}: ${this.getErrorSummary(error)}`);
        })
        .finally(() => {
          renewalInProgress = false;
        });
    }, LEASE_RENEWAL_INTERVAL_MS);

    timer.unref();
    return {
      stop: async () => {
        stopped = true;
        clearInterval(timer);
        await pendingRenewal;
      },
    };
  }

  private async scheduleRetry(message: OutboxOrmEntity, leaseToken: string, errorSummary: string): Promise<void> {
    const deadLettered = message.attemptCount >= MAX_ATTEMPTS;
    const retryDelay = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** (message.attemptCount - 1), MAX_RETRY_DELAY_MS);
    const now = new Date();
    const result = await this.dataSource.getRepository(OutboxOrmEntity).update(
      {
        id: message.id,
        processedAt: IsNull(),
        deadLetteredAt: IsNull(),
        leaseToken,
      },
      {
        nextAttemptAt: deadLettered ? message.nextAttemptAt : new Date(now.getTime() + retryDelay),
        leaseOwner: null,
        leaseToken: null,
        leaseUntil: null,
        lastError: errorSummary,
        ...(deadLettered ? { deadLetteredAt: now } : {}),
      },
    );

    if (result.affected !== 1) {
      this.logger.warn(`Could not schedule retry for outbox message ${message.id}; its lease is no longer owned by this worker.`);
      return;
    }

    if (deadLettered) {
      this.logger.error(`Outbox message ${message.id} moved to dead letter after ${message.attemptCount} attempts: ${errorSummary}`);
    } else {
      this.logger.warn(`Outbox message ${message.id} failed on attempt ${message.attemptCount}; retry scheduled.`);
    }
  }

  private getErrorSummary(error: unknown): string {
    const summary = error instanceof Error ? `${error.name}: ${error.message}` : 'Non-Error exception thrown';
    return summary.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]').slice(0, 1_000);
  }
}
