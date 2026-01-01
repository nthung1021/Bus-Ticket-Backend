import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
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
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    private readonly emailService: EmailService,
  ) { }

  @Cron(CronExpression.EVERY_HOUR)
  async handleTripReminders() {
    this.logger.debug('Running scheduled trip reminders');

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
  async getUserNotifications(
    userId: string,
    filters: { status?: string; page?: number; limit?: number } = {},
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'unread') {
        where.status = Not(NotificationStatus.READ);
      } else if (filters.status === 'read') {
        where.status = NotificationStatus.READ;
      }
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where,
      order: { sentAt: 'DESC' },
      skip,
      take: limit,
      relations: ['booking'] // Include booking data if needed, usually notification data blob is enough but relation is good
    });

    // Map entity to API response format if needed, or return/transform in controller
    const mappedNotifications = notifications.map(n => ({
      id: n.id,
      userId: n.userId,
      type: n.type || 'system', // Default type if missing
      title: n.title,
      message: n.message,
      data: n.data,
      isRead: n.status === NotificationStatus.READ,
      createdAt: n.sentAt,
      updatedAt: n.sentAt,
    }));

    return {
      data: mappedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.status = NotificationStatus.READ;
    await this.notificationRepository.save(notification);

    return { success: true, message: 'notification marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, status: Not(NotificationStatus.READ) },
      { status: NotificationStatus.READ }
    );
    return { success: true, message: 'All notifications marked as read' };
  }

  async createInAppNotification(
    userId: string,
    title: string,
    message: string,
    data?: any,
    bookingId?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      data,
      bookingId,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      template: 'in_app_notification', // Generic template name
    });

    return await this.notificationRepository.save(notification);
  }
}
