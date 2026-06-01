import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AudioProcessor } from './audio.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audio',
    }),
  ],
  providers: [AudioProcessor],
})
export class AudioModule {}
