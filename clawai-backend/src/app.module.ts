import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DetectionModuleModule } from './detection-module/detection-module.module';
import { TrainingModuleModule } from './training-module/training-module.module';
import { StatsModuleModule } from './stats-module/stats-module.module';
import { AppModuleModule } from './core-module/app-module/app-module.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static'; // 1. Importe
import { join } from 'path'; // 2. Importe o 'join' do Node.js

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 3. Adicione o ServeStaticModule
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
        },
      },
    }),

    // 2. Configura a conexão com o banco de dados
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        autoLoadEntities: true, // Carrega automaticamente as entidades
        synchronize: true, // Sincroniza o schema com o DB (Ótimo para dev, NUNCA use em prod)
      }),
    }),

    // Seus módulos
    DetectionModuleModule,
    TrainingModuleModule,
    StatsModuleModule,
    AppModuleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}