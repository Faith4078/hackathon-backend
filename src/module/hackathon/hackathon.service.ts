import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { CreateHackathonDto } from './dto/create-hackathon.dto.js';
import { UpdateHackathonDto } from './dto/update-hackathon.dto.js';

@Injectable()
export class HackathonService {
  constructor(private readonly prisma: PrismaService) {}

  create(authorId: string, dto: CreateHackathonDto) {
    return this.prisma.client.hackathon.create({
      data: {
        name: dto.name,
        description: dto.description,
        startDate: dto.startsAt,
        endDate: dto.endsAt,
        isActive: dto.isActive,
        authorId,
      },
    });
  }

  findAll() {
    return this.prisma.client.hackathon.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const hackathon = await this.prisma.client.hackathon.findUnique({
      where: { id },
    });
    if (!hackathon) throw new NotFoundException(`Hackathon ${id} not found`);
    return hackathon;
  }

  async update(id: string, dto: UpdateHackathonDto) {
    await this.findOne(id);
    return this.prisma.client.hackathon.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        startDate: dto.startsAt,
        endDate: dto.endsAt,
        isActive: dto.isActive,
      },
    });
  }

  async join(hackathonId: string, userId: string) {
    const hackathon = await this.findOne(hackathonId);
    if (!hackathon.isActive) {
      throw new BadRequestException('This hackathon is not active');
    }
    const now = new Date();
    if (hackathon.endDate <= now) {
      throw new BadRequestException('This hackathon has already ended');
    }
    if (hackathon.startDate <= now) {
      throw new BadRequestException(
        'Registration is closed: this hackathon has already started',
      );
    }

    try {
      return await this.prisma.client.hackathonParticipant.create({
        data: { hackathonId, userId },
      });
    } catch (error) {
      // The unique(hackathonId, userId) constraint also covers concurrent joins.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('You have already joined this hackathon');
      }
      throw error;
    }
  }

  async leave(hackathonId: string, userId: string) {
    try {
      return await this.prisma.client.hackathonParticipant.delete({
        where: { hackathonId_userId: { hackathonId, userId } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('You have not joined this hackathon');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.client.hackathon.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Hackathon ${id} not found`);
      }
      throw error;
    }
  }
}
