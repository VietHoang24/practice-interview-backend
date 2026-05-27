import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
export declare class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
    constructor();
    onModuleInit(): void;
    onModuleDestroy(): void;
}
