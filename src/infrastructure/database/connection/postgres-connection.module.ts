import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  // imports: [
  //   TypeOrmModule.forRootAsync({
  //     imports: [ConfigModule],
  //     inject: [ConfigService],
  //     useFactory: (config: ConfigService) => ({
  //       type: 'postgres',
  //       url: config.getOrThrow<string>('DATABASE_URL'),
  //       autoLoadEntities: true,
  //       synchronize: true, // false in production
  //       migrationsRun: false,
  //       extra: {
  //         max: Number(config.get('DB_POOL_MAX') ?? 10),
  //       },
  //     }),
  //   }),
  // ],
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        //const sslEnabled = config.get<string>('DB_SSL') === 'true' || isProd;

        return {
          type: 'postgres',
          url: config.getOrThrow<string>('DATABASE_URL'),
          autoLoadEntities: true,
          synchronize: false,
          migrations: ['dist/migrations/*.js'],
          migrationsRun: config.get<string>('DB_MIGRATIONS_RUN') === 'true' || isProd,
          //  ssl: sslEnabled ? { rejectUnauthorized: true } : false,
          // extra: {
          //   max: Number(config.get('DB_POOL_MAX') ?? 10),
          //   idleTimeoutMillis: Number(config.get('DB_IDLE_TIMEOUT_MS') ?? 30000),
          //   connectionTimeoutMillis: Number(config.get('DB_CONN_TIMEOUT_MS') ?? 5000),
          //   ssl: sslEnabled
          //     ? {
          //         rejectUnauthorized: config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false',
          //       }
          //     : false,
          // },
        };
      },
    }),
  ],
})
export class ConnectionModule {}
