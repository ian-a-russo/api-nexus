import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [StorageModule, UsersModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
