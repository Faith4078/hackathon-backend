import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Arcjet protection is applied globally through ArcjetGuard in AppModule.
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
