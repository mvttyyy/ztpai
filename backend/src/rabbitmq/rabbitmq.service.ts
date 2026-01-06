import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export const QUEUES = {
  AUDIO_PROCESSING: 'audio_processing',
  WAVEFORM_GENERATION: 'waveform_generation',
  NOTIFICATIONS: 'notifications',
};

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect() {
    try {
      const url = this.configService.get('RABBITMQ_URL', 'amqp://localhost:5672');
      this.connection = await amqp.connect(url);
      this.channel = await this.connection!.createChannel();

      for (const queue of Object.values(QUEUES)) {
        await this.channel!.assertQueue(queue, { durable: true });
      }

      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async close() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }

  async publish(queue: string, message: object) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );
  }

  async consume(queue: string, callback: (message: object) => Promise<void>) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    await this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          this.channel?.ack(msg);
        } catch (error) {
          console.error(`Error processing message from ${queue}:`, error);
          this.channel?.nack(msg, false, false);
        }
      }
    });
  }
}
