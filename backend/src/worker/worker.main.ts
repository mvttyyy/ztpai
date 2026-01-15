import { PrismaClient, LoopStatus } from '@prisma/client';
import * as amqp from 'amqplib';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const QUEUES = {
  AUDIO_PROCESSING: 'audio_processing',
  WAVEFORM_GENERATION: 'waveform_generation',
  NOTIFICATIONS: 'notifications',
};

interface AudioProcessingMessage {
  loopId: string;
  filePath: string;
  type: 'transcode' | 'waveform';
}

interface NotificationMessage {
  type: string;
  userId: string;
  data: any;
}

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format "${filePath}"`
    );
    const data = JSON.parse(stdout);
    if (data.format && data.format.duration) {
      return parseFloat(data.format.duration);
    }
  } catch (error) {
    console.error('Error getting audio duration:', error);
  }
  return 0;
}

async function processAudio(message: AudioProcessingMessage) {
  console.log(`Processing audio for loop: ${message.loopId}`);

  try {
    // Update status to processing
    await prisma.loop.update({
      where: { id: message.loopId },
      data: { status: LoopStatus.PROCESSING },
    });

    const inputPath = message.filePath;
    const previewDir = './uploads/previews';
    const waveformDir = './uploads/waveforms';

    // Ensure directories exist
    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
    if (!fs.existsSync(waveformDir)) fs.mkdirSync(waveformDir, { recursive: true });

    const previewPath = path.join(previewDir, `${message.loopId}.mp3`);

    // Generate preview (128 kbps MP3)
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .format('mp3')
        .on('end', () => {
          console.log(`Preview generated for loop: ${message.loopId}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`FFmpeg error for loop ${message.loopId}:`, err);
          reject(err);
        })
        .save(previewPath);
    });

    // Get actual audio duration
    const duration = await getAudioDuration(inputPath);
    console.log(`Detected duration for loop ${message.loopId}: ${duration}s`);

    // Generate waveform data
    const waveformData = await generateWaveformData(inputPath);

    // Store relative path for preview file
    const relativePreviewPath = `previews/${message.loopId}.mp3`;

    // Update loop with preview path, waveform data, and actual duration
    const updateData: any = {
      previewFile: relativePreviewPath,
      waveformData: waveformData,
      status: LoopStatus.READY,
    };
    
    // Only update duration if we got a valid value
    if (duration > 0) {
      updateData.duration = duration;
    }

    await prisma.loop.update({
      where: { id: message.loopId },
      data: updateData,
    });

    console.log(`Loop ${message.loopId} processed successfully`);
  } catch (error) {
    console.error(`Error processing loop ${message.loopId}:`, error);

    // Update status to failed
    await prisma.loop.update({
      where: { id: message.loopId },
      data: { status: LoopStatus.FAILED },
    });
  }
}

async function generateWaveformData(filePath: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const samples: number[] = [];
    let maxSample = 0;

    // Use ffmpeg to extract audio samples
    ffmpeg(filePath)
      .format('f32le')
      .audioChannels(1)
      .audioFrequency(8000) // Downsample for waveform
      .on('error', (err) => {
        console.error('Waveform generation error:', err);
        // Return simple waveform on error
        resolve(Array(100).fill(0.5));
      })
      .pipe()
      .on('data', (chunk: Buffer) => {
        for (let i = 0; i < chunk.length; i += 4) {
          if (i + 4 <= chunk.length) {
            const sample = Math.abs(chunk.readFloatLE(i));
            samples.push(sample);
            if (sample > maxSample) maxSample = sample;
          }
        }
      })
      .on('end', () => {
        // Normalize and reduce to ~100 samples
        const targetSamples = 100;
        const step = Math.max(1, Math.floor(samples.length / targetSamples));
        const normalizedSamples: number[] = [];

        for (let i = 0; i < samples.length; i += step) {
          if (normalizedSamples.length >= targetSamples) break;
          
          // Average a chunk of samples
          let sum = 0;
          let count = 0;
          for (let j = i; j < i + step && j < samples.length; j++) {
            sum += samples[j];
            count++;
          }
          
          const avg = count > 0 ? sum / count : 0;
          normalizedSamples.push(maxSample > 0 ? avg / maxSample : 0);
        }

        resolve(normalizedSamples);
      });
  });
}

async function processNotification(message: NotificationMessage) {
  console.log(`Processing notification for user: ${message.userId}`);

  try {
    let title = '';
    let notificationMessage = '';

    switch (message.type) {
      case 'NEW_COMMENT':
        title = 'New Comment';
        notificationMessage = `${message.data.commenterUsername} commented on "${message.data.loopTitle}"`;
        break;
      case 'NEW_RATING':
        title = 'New Rating';
        notificationMessage = `Someone rated "${message.data.loopTitle}" with ${message.data.rating} stars`;
        break;
      case 'NEW_DOWNLOAD':
        title = 'Loop Downloaded';
        notificationMessage = `${message.data.downloaderUsername} downloaded "${message.data.loopTitle}"`;
        break;
      case 'LOOP_PROCESSED':
        title = 'Loop Ready';
        notificationMessage = `Your loop "${message.data.loopTitle}" has been processed and is now available`;
        break;
      default:
        title = 'Notification';
        notificationMessage = 'You have a new notification';
    }

    await prisma.notification.create({
      data: {
        type: message.type as any,
        title,
        message: notificationMessage,
        data: message.data,
        userId: message.userId,
      },
    });

    console.log(`Notification created for user: ${message.userId}`);
  } catch (error) {
    console.error(`Error creating notification:`, error);
  }
}

async function main() {
  console.log('🔧 Starting BeatThat Worker...');

  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

  let connection: amqp.ChannelModel | null = null;
  let channel: amqp.Channel | null = null;

  // Retry connection
  while (!connection) {
    try {
      connection = await amqp.connect(rabbitmqUrl);
      console.log('✅ Connected to RabbitMQ');
    } catch (error) {
      console.log('⏳ Waiting for RabbitMQ...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  channel = await connection!.createChannel();

  // Assert queues
  await channel!.assertQueue(QUEUES.AUDIO_PROCESSING, { durable: true });
  await channel!.assertQueue(QUEUES.NOTIFICATIONS, { durable: true });

  // Set prefetch
  channel!.prefetch(1);

  // Consume audio processing queue
  channel!.consume(QUEUES.AUDIO_PROCESSING, async (msg) => {
    if (msg) {
      try {
        const message: AudioProcessingMessage = JSON.parse(msg.content.toString());
        await processAudio(message);
        channel?.ack(msg);
      } catch (error) {
        console.error('Error processing audio message:', error);
        channel?.nack(msg, false, false);
      }
    }
  });

  // Consume notifications queue
  channel!.consume(QUEUES.NOTIFICATIONS, async (msg) => {
    if (msg) {
      try {
        const message: NotificationMessage = JSON.parse(msg.content.toString());
        await processNotification(message);
        channel?.ack(msg);
      } catch (error) {
        console.error('Error processing notification message:', error);
        channel?.nack(msg, false, false);
      }
    }
  });

  console.log('🎵 Worker is running and waiting for messages...');
}

main().catch(console.error);
