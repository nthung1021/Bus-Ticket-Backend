import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel, NotificationStatus } from '../entities/notification.entity';
import { BookingService } from '../booking/booking.service';
import { EmailService } from '../booking/email.service';
import { getTripReminderTemplate } from '../booking/email.templates';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private readonly bookingService: BookingService,
    private readonly emailService: EmailService,
  ) { }

  @Cron(CronExpression.EVERY_HOUR)
  async handleTripReminders() {
    this.logger.log('Running scheduled trip reminders (NotificationsService)...');

    // 1. Get eligible bookings from BookingService
    const bookings = await this.bookingService.findUpcomingPaidBookings(24);

    let sentCount = 0;

    for (const booking of bookings) {
      try {
        // 2. Check deduplication
        const existing = await this.notificationRepository.findOne({
          where: {
            bookingId: booking.id,
            template: 'trip_reminder_email',
            status: NotificationStatus.SENT,
          },
        });

        if (existing) continue;

        const email = booking.user?.email || booking.contactEmail;
        if (!email) continue;

        // 3. Send Email
        await this.emailService.sendEmail({
          to: email,
          subject: `Trip Reminder: ${booking.trip.route.origin} to ${booking.trip.route.destination}`,
          html: getTripReminderTemplate(booking),
          text: `Reminder: Your trip is coming up on ${booking.trip.departureTime}`,
        });

        // 4. Save Notification
        await this.notificationRepository.save({
          bookingId: booking.id,
          channel: NotificationChannel.EMAIL,
          template: 'trip_reminder_email',
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        });

        sentCount++;
      } catch (error) {
        this.logger.error(`Failed to send reminder for booking ${booking.id}: ${error.message}`);
      }
    }

    if (sentCount > 0) {
      this.logger.log(`Sent ${sentCount} trip reminders`);
    }
  }
}
