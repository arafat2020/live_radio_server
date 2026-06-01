import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DRIZZLE } from '../db/db.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import * as fs from 'fs';
import * as path from 'path';
import { MinioService } from '../minio/minio.service';

@Injectable()
@Processor('audio')
export class AudioProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AudioProcessor.name);

  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private readonly minioService: MinioService,
  ) {
    super();
  }

  async onModuleInit() {
    this.logger.log('Checking for placeholder playlist...');
    const playlistsDir = path.resolve(process.cwd(), 'storage', 'playlists');
    if (!fs.existsSync(playlistsDir)) {
      fs.mkdirSync(playlistsDir, { recursive: true });
    }
    const playlistPath = path.join(playlistsDir, 'radio.m3u');
    if (!fs.existsSync(playlistPath)) {
      fs.writeFileSync(playlistPath, '# Empty Playlist\n');
      this.logger.log('Created empty placeholder playlist at ' + playlistPath);
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'playlist.generate') {
      await this.generatePlaylist();
    }
  }

  private async generatePlaylist() {
    this.logger.log('Fetching tracks from database to generate playlist...');
    
    // Fetch all tracks from the database
    const allTracks = await this.db.select().from(schema.tracks);
    
    // Generate M3U content with plain URLs (bucket is public).
    // Use 'minio' hostname so Liquidsoap (inside Docker) can reach it.
    const bucket = this.minioService.getBucketName();
    const m3uLines = allTracks.map(t => {
      return `http://minio:9000/${bucket}/${t.minioKey}`;
    });
    
    const m3uContent = m3uLines.join('\n');
    
    // Ensure the playlists directory exists
    const playlistsDir = path.resolve(process.cwd(), 'storage', 'playlists');
    if (!fs.existsSync(playlistsDir)) {
      fs.mkdirSync(playlistsDir, { recursive: true });
    }
    
    // Write to radio.m3u
    const playlistPath = path.join(playlistsDir, 'radio.m3u');
    fs.writeFileSync(playlistPath, m3uContent || '# Empty Playlist\n');
    
    this.logger.log(`Playlist generated with ${allTracks.length} tracks at ${playlistPath}`);
  }
}
