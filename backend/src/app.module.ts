import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LoopsModule } from './modules/loops/loops.module';
import { TagsModule } from './modules/tags/tags.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { DownloadsModule } from './modules/downloads/downloads.module';
import { TrendingModule } from './modules/trending/trending.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Static file serving for uploads (hardcoded path for Docker environment)
    ServeStaticModule.forRoot({
      rootPath: '/app/uploads',
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
      },
    }),
    
    // Database
    PrismaModule,

    
    // Message Queue
    RabbitMQModule,
    
    // Feature modules
    AuthModule,
    UsersModule,
    LoopsModule,
    TagsModule,
    RatingsModule,
    CommentsModule,
    FavoritesModule,
    DownloadsModule,
    TrendingModule,
    ChatModule,
    NotificationsModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
