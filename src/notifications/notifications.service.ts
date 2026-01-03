import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Notification, NotificationChannel, NotificationStatus } from '../entities/notification.entity';
import { User, UserRole } from '../entities/user.entity';
import { BookingService } from '../booking/booking.service';
import { EmailService } from '../booking/email.service';
import { getTripReminderTemplate } from '../booking/email.templates';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

  /**
   * Notify all admin users about a booking cancellation
   */
  async notifyAdminsAboutCancellationRequest(
    bookingReference: string,
    customerName: string,
    customerEmail: string,
    refundAmount: number,
    totalAmount: number,
    bookingId: string,
    tripInfo: { origin: string; destination: string; departureTime: Date }
  ): Promise<void> {
    try {
      this.logger.log(`Starting admin notification for booking cancellation request: ${bookingReference}`);
      
      // Get all admin users
      const adminUsers = await this.userRepository.find({
        where: { role: UserRole.ADMIN }
      });

      this.logger.log(`Found ${adminUsers.length} admin users for notification`);

      if (adminUsers.length === 0) {
        this.logger.warn('No admin users found to notify about cancellation request');
        return;
      }

      // Prepare notification data
      const title = 'Cancellation Request - Action Required';
      const refundPercentage = Math.round((refundAmount / totalAmount) * 100);
      const message = `Customer ${customerName} (${customerEmail}) has requested to cancel booking ${bookingReference}. ` +
        `Trip: ${tripInfo.origin} → ${tripInfo.destination} (${tripInfo.departureTime.toLocaleDateString()}). ` +
        `Requested refund: ${refundAmount.toLocaleString()} VND (${refundPercentage}% of ${totalAmount.toLocaleString()} VND). ` +
        `Please review and approve/reject this cancellation request.`;

      const notificationData = {
        bookingId,
        bookingReference,
        customerName,
        customerEmail,
        refundAmount,
        totalAmount,
        refundPercentage,
        tripInfo,
        type: 'cancellation_request',
        status: 'pending_approval'
      };

      // Send notification to each admin
      const notifications = adminUsers.map(admin => 
        this.notificationRepository.create({
          userId: admin.id,
          bookingId,
          title,
          message,
          type: 'cancellation_request',
          data: notificationData,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          template: 'admin_cancellation_request',
        })
      );

      await this.notificationRepository.save(notifications);
      
      this.logger.log(`Sent cancellation request notifications to ${adminUsers.length} admin(s) for booking ${bookingReference}`);
    } catch (error) {
      this.logger.error(`Failed to notify admins about cancellation request ${bookingReference}: ${error.message}`);
    }
  }

  async notifyAdminsAboutCancellation(
    bookingReference: string,
    customerName: string,
    customerEmail: string,
    refundAmount: number,
    totalAmount: number,
    bookingId: string,
    tripInfo: { origin: string; destination: string; departureTime: Date }
  ): Promise<void> {
    try {
      this.logger.log(`Starting admin notification for booking cancellation: ${bookingReference}`);
      
      // Get all admin users
      const adminUsers = await this.userRepository.find({
        where: { role: UserRole.ADMIN }
      });

      this.logger.log(`Found ${adminUsers.length} admin users for notification`);

      if (adminUsers.length === 0) {
        this.logger.warn('No admin users found to notify about booking cancellation');
        return;
      }

      // Prepare notification data
      const title = 'Booking Cancelled by Customer';
      const refundPercentage = Math.round((refundAmount / totalAmount) * 100);
      const message = `Customer ${customerName} (${customerEmail}) has cancelled booking ${bookingReference}. ` +
        `Trip: ${tripInfo.origin} → ${tripInfo.destination} (${tripInfo.departureTime.toLocaleDateString()}). ` +
        `Refund: ${refundAmount.toLocaleString()} VND (${refundPercentage}% of ${totalAmount.toLocaleString()} VND).`;

      const notificationData = {
        bookingId,
        bookingReference,
        customerName,
        customerEmail,
        refundAmount,
        totalAmount,
        refundPercentage,
        tripInfo,
        type: 'booking_cancellation'
      };

      // Send notification to each admin
      const notifications = adminUsers.map(admin => 
        this.notificationRepository.create({
          userId: admin.id,
          bookingId,
          title,
          message,
          type: 'booking_cancellation',
          data: notificationData,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          template: 'admin_booking_cancellation',
        })
      );

      await this.notificationRepository.save(notifications);
      
      this.logger.log(`Sent cancellation notifications to ${adminUsers.length} admin(s) for booking ${bookingReference}`);
    } catch (error) {
      this.logger.error(`Failed to notify admins about booking cancellation ${bookingReference}: ${error.message}`);
    }
  }
}
