import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { UserService } from './user.service.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Declared before ':id' so "all" is not captured as an id.
  @Get('all')
  @Roles(['ADMIN'])
  @ResponseMessage('Users retrieved successfully')
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ResponseMessage('User retrieved successfully')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
