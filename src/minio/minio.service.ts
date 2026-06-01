import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { S3Client, CreateBucketCommand, HeadBucketCommand, GetObjectCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  public readonly s3Client: S3Client;
  private readonly bucketName = 'audio-files';

  constructor() {
    this.s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    this.logger.log('Checking MinIO bucket...');
    try {

      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));

      this.logger.log(`Bucket "${this.bucketName}" already exists.`);

    } catch (error: any) {

      if (error.$metadata?.httpStatusCode === 404) {

        this.logger.log(`Bucket "${this.bucketName}" does not exist. Creating...`);

        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));

        this.logger.log(`Bucket "${this.bucketName}" created successfully.`);

      } else {

        this.logger.error(`Error checking MinIO bucket: ${error.message}`);

      }
    }
    
    // Always ensure the bucket is public so Liquidsoap can read the files without auth
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };
      await this.s3Client.send(new PutBucketPolicyCommand({
        Bucket: this.bucketName,
        Policy: JSON.stringify(policy)
      }));
      this.logger.log(`Bucket "${this.bucketName}" policy set to public read.`);
    } catch (error: any) {
      this.logger.error(`Failed to set bucket policy: ${error.message}`);
    }
  }

  getBucketName() {
    return this.bucketName;
  }

  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
