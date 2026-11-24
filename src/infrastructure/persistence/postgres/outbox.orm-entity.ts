import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('outbox_messages')
@Index('idx_outbox_due', ['nextAttemptAt', 'createdAt'], { where: 'processed_at IS NULL AND dead_lettered_at IS NULL' })
@Index('idx_outbox_lease', ['leaseUntil'], { where: 'processed_at IS NULL AND dead_lettered_at IS NULL AND lease_until IS NOT NULL' })
export class OutboxOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Column({ name: 'aggregate_id', type: 'uuid' }) @Index() aggregateId!: string;
  @Column({ name: 'event_type', length: 255 }) eventType!: string;
  @Column({ type: 'jsonb' }) payload!: unknown;
  @Column({ name: 'processed_at', type: 'timestamp', nullable: true }) @Index() processedAt!: Date | null;
  @Column({ name: 'attempt_count', type: 'integer', default: 0 }) attemptCount!: number;
  @Column({ name: 'next_attempt_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) nextAttemptAt!: Date;
  @Column({ name: 'lease_owner', type: 'uuid', nullable: true }) leaseOwner!: string | null;
  @Column({ name: 'lease_token', type: 'uuid', nullable: true }) leaseToken!: string | null;
  @Column({ name: 'lease_until', type: 'timestamp', nullable: true }) leaseUntil!: Date | null;
  @Column({ name: 'last_error', type: 'text', nullable: true }) lastError!: string | null;
  @Column({ name: 'dead_lettered_at', type: 'timestamp', nullable: true }) deadLetteredAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
