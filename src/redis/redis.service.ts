import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  }

  onModuleInit() {
    this.on('connect', () => console.log('Redis connected'));
    this.on('error', (err) => console.error('Redis error', err));
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
