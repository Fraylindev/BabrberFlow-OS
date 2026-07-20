import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(organizationId, createBookingDto);
  }

  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.bookingsService.findAll(organizationId);
  }

  // 🔄 NUEVO: Ruta para actualizar el estado
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @GetUser('organizationId') organizationId: string,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(
      id,
      organizationId,
      updateBookingStatusDto,
    );
  }
}
