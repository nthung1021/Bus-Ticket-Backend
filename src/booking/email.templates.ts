import { Booking } from '../entities/booking.entity';

export const getBookingConfirmationTemplate = (booking: Booking): string => {
  const trip = booking.trip;
  const route = trip?.route;
  const bus = trip?.bus;
  const passengers = booking.passengerDetails || [];

  const departureDate = trip?.departureTime
    ? new Date(trip.departureTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const departureTime = trip?.departureTime
    ? new Date(trip.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const rows = passengers.map((p, i) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${i + 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.fullName}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.seatCode}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #2563eb; color: #fff; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 20px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: 600; color: #2563eb; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { margin-bottom: 5px; }
    .label { font-size: 12px; color: #666; display: block; margin-bottom: 2px; }
    .value { font-size: 15px; font-weight: 500; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th { text-align: left; padding: 10px; background-color: #f8fafc; color: #64748b; font-size: 12px; font-weight: 600; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .button { display: inline-block; background-color: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Confirmed!</h1>
      <p style="margin: 10px 0 0; opacity: 0.9;">Reference: ${booking.bookingReference}</p>
    </div>
    
    <div class="content">
      <p>Dear Customer,</p>
      <p>Thank you for using our service. Your trip is confirmed. Please find your e-ticket attached to this email.</p>
      
      <div class="section">
        <div class="section-title">Trip Details</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Route</span>
            <span class="value">${route?.origin || 'Unknown'} &rarr; ${route?.destination || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="label">Date</span>
            <span class="value">${departureDate}</span>
          </div>
          <div class="info-item">
            <span class="label">Time</span>
            <span class="value">${departureTime}</span>
          </div>
          <div class="info-item">
            <span class="label">Bus</span>
            <span class="value">${bus?.model || ''} (${bus?.plateNumber || ''})</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Passenger(s)</div>
        <table class="table">
          <thead>
            <tr>
              <th width="10%">#</th>
              <th width="60%">Name</th>
              <th width="30%">Seat</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Payment Summary</div>
        <div class="info-item">
          <span class="label">Total Amount</span>
          <span class="value" style="font-size: 18px; color: #059669;">${Number(booking.totalAmount).toLocaleString()} VND</span>
        </div>
        <div class="info-item">
          <span class="label">Status</span>
          <span class="value" style="text-transform: capitalize;">${booking.status}</span>
        </div>
      </div>
      
      <div style="text-align: center;">
        <p style="font-size: 14px; color: #666;">Please arrive at the station at least 30 minutes before departure.</p>
      </div>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Bus Ticket Booking. All rights reserved.</p>
      <p>If you have any questions, please contact our support.</p>
    </div>
  </div>
</body>
</html>
  `;
};

export const getTripReminderTemplate = (booking: Booking): string => {
  const trip = booking.trip;
  const route = trip?.route;
  const departureDate = trip?.departureTime
    ? new Date(trip.departureTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';
  const departureTime = trip?.departureTime
    ? new Date(trip.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #f59e0b; color: #fff; padding: 20px; text-align: center; } /* Amber color for reminder */
    .content { padding: 30px 20px; }
    .trip-box { background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0; font-size: 24px;">Upcoming Trip Reminder</h1>
    </div>
    <div class="content">
      <p>Hello ${booking.passengerDetails?.[0]?.fullName || 'Traveler'},</p>
      <p>This is a friendly reminder that your bus trip is coming up tomorrow!</p>
      
      <div class="trip-box">
        <h3 style="margin-top:0;">${route?.origin} &rarr; ${route?.destination}</h3>
        <p><strong>Departure:</strong> ${departureDate} at ${departureTime}</p>
        <p><strong>Bus Plate:</strong> ${trip?.bus?.plateNumber}</p>
        <p><strong>Booking Ref:</strong> ${booking.bookingReference}</p>
      </div>

      <p>Please remember to:</p>
      <ul>
        <li>Arrive 30 minutes early.</li>
        <li>Have your ID and E-Ticket ready.</li>
      </ul>
      
      <p>Have a safe trip!</p>
    </div>
    <div class="footer">
      <p>Sent by Bus Ticket Booking System</p>
    </div>
  </div>
</body>
</html>
  `;
};
