import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { CreateHackathonDto } from './dto/create-hackathon.dto.js';
import { UpdateHackathonDto } from './dto/update-hackathon.dto.js';
import { HackathonService } from './hackathon.service.js';

// Reads need any signed-in user (the global AuthGuard); writes are ADMIN only.
@Controller('hackathon')
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}

  @Post()
  @Roles(['ADMIN'])
  @ResponseMessage('Hackathon created successfully')
  create(@Session() session: UserSession, @Body() dto: CreateHackathonDto) {
    return this.hackathonService.create(session.user.id, dto);
  }

  @Get()
  @ResponseMessage('Hackathons retrieved successfully')
  findAll() {
    return this.hackathonService.findAll();
  }

  @Get(':id')
  @ResponseMessage('Hackathon retrieved successfully')
  findOne(@Param('id') id: string) {
    return this.hackathonService.findOne(id);
  }

  @Post(':id/join')
  @Roles(['PARTICIPANT'])
  @ResponseMessage('Joined hackathon successfully')
  join(@Param('id') id: string, @Session() session: UserSession) {
    return this.hackathonService.join(id, session.user.id);
  }

  @Delete(':id/leave')
  @Roles(['PARTICIPANT'])
  @ResponseMessage('Left hackathon successfully')
  leave(@Param('id') id: string, @Session() session: UserSession) {
    return this.hackathonService.leave(id, session.user.id);
  }

  @Patch(':id')
  @Roles(['ADMIN'])
  @ResponseMessage('Hackathon updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateHackathonDto) {
    return this.hackathonService.update(id, dto);
  }

  @Delete(':id')
  @Roles(['ADMIN'])
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Hackathon deleted successfully')
  remove(@Param('id') id: string) {
    return this.hackathonService.remove(id);
  }
}
