import 'multer';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { DRIZZLE } from '../db/db.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly minioService: MinioService,
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    @InjectQueue('audio') private readonly audioQueue: Queue,
  ) {}

  async uploadAndProcess(file: Express.Multer.File) {
    const key = `tracks/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const bucket = this.minioService.getBucketName();

    this.logger.log(`Uploading file ${file.originalname} to MinIO...`);

    // 1. Upload to MinIO
    await this.minioService.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    // 2. Generate plain URL (bucket is public, so no presigning needed)
    const minioEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const url = `${minioEndpoint}/${bucket}/${key}`;

    this.logger.log(`File uploaded successfully: ${url}`);

    // 2. Save to Database
    const newTrack = await this.db.insert(schema.tracks).values({
      title: file.originalname,
      duration: 0, // In a real app, parse audio duration before saving
      minioKey: key,
      url: url,
    }).returning();

    this.logger.log(`Track saved to DB with ID: ${newTrack[0].id}`);

    // 3. Trigger playlist regeneration
    await this.audioQueue.add('playlist.generate', { trackId: newTrack[0].id });

    return newTrack[0];
  }
}
