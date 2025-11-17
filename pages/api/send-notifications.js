import { Resend } from 'resend';
import { neon } from '@neondatabase/serverless';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const debugInfo = {
    method: req.method,
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    debugInfo.steps.push('1. Handler started');

    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed', debug: debugInfo });
    }

    debugInfo.steps.push('2. Method check passed');

    // Check environment variables
    debugInfo.hasResendKey = !!process.env.RESEND_API_KEY;
    debugInfo.hasNotificationEmail = !!process.env.NOTIFICATION_EMAIL;
    debugInfo.hasDatabaseUrl = !!process.env.DATABASE_URL;

    if (!process.env.RESEND_API_KEY) {
      debugInfo.steps.push('ERROR: Missing RESEND_API_KEY');
      return res.status(500).json({ error: 'Missing RESEND_API_KEY', debug: debugInfo });
    }

    if (!process.env.NOTIFICATION_EMAIL) {
      debugInfo.steps.push('ERROR: Missing NOTIFICATION_EMAIL');
      return res.status(500).json({ error: 'Missing NOTIFICATION_EMAIL', debug: debugInfo });
    }

    if (!process.env.DATABASE_URL) {
      debugInfo.steps.push('ERROR: Missing DATABASE_URL');
      return res.status(500).json({ error: 'Missing DATABASE_URL', debug: debugInfo });
    }

    debugInfo.steps.push('3. Environment variables OK');

    const sql = neon(process.env.DATABASE_URL);
    debugInfo.steps.push('4. Database connection created');
    
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const targetDate = twoDaysFromNow.toISOString().split('T')[0];
    
    debugInfo.targetDate = targetDate;
    debugInfo.steps.push('5. Target date calculated: ' + targetDate);
    
    const upcomingBookings = await sql`
      SELECT * FROM bookings 
      WHERE check_in = ${targetDate}
    `;

    debugInfo.bookingsFound = upcomingBookings.length;
    debugInfo.steps.push('6. Database query completed: ' + upcomingBookings.length + ' bookings found');

    if (upcomingBookings.length === 0) {
      debugInfo.steps.push('7. No bookings to notify');
      return res.status(200).json({ 
        message: 'No bookings in 2 days',
        count: 0,
        debug: debugInfo
      });
    }

    debugInfo.bookingDetails = upcomingBookings.map(b => ({
      id: b.id,
      name: b.booking_name,
      apartment: b.apartment,
      checkIn: b.check_in,
      checkOut: b.check_out
    }));

    debugInfo.steps.push('7. Preparing to send emails to: ' + process.env.NOTIFICATION_EMAIL);

    const emailPromises = upcomingBookings.map(async (booking) => {
      const apartmentName = booking.apartment === '1' ? 'Αριστερό' : 'Δεξί';
      const checkInDate = new Date(booking.check_in);
      const checkOutDate = new Date(booking.check_out);
      
      debugInfo.steps.push('8. Sending email for booking #' + booking.id);
      
      const result = await resend.emails.send({
        from: 'Κρατήσεις <onboarding@resend.dev>',
        to: process.env.NOTIFICATION_EMAIL,
        subject: `🔔 Υπενθύμιση: Κράτηση σε 2 μέρες`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">🔔 Υπενθύμιση Κράτησης</h2>
            <p style="font-size: 16px;"><strong>Σε 2 μέρες έχετε κράτηση!</strong></p>
            <hr style="border: 1px solid #E5E7EB; margin: 20px 0;" />
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Όνομα:</strong></td>
                <td style="padding: 8px 0;">${booking.booking_name || 'Χωρίς όνομα'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Διαμέρισμα:</strong></td>
                <td style="padding: 8px 0;">${apartmentName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Άφιξη:</strong></td>
                <td style="padding: 8px 0;">${checkInDate.toLocaleDateString('el-GR')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Αναχώρηση:</strong></td>
                <td style="padding: 8px 0;">${checkOutDate.toLocaleDateString('el-GR')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Άτομα:</strong></td>
                <td style="padding: 8px 0;">${booking.adults || 0} ενήλικες, ${booking.kids || 0} παιδιά</td>
              </tr>
            </table>
            
            <hr style="border: 1px solid #E5E7EB; margin: 20px 0;" />
            <p style="color: #6B7280; font-size: 12px;">ID Κράτησης: #${booking.id}</p>
          </div>
        `
      });

      debugInfo.steps.push('9. Email sent result: ' + JSON.stringify(result));
      return result;
    });

    const results = await Promise.all(emailPromises);
    debugInfo.steps.push('10. All emails sent successfully: ' + results.length);

    return res.status(200).json({ 
      message: 'Notifications sent successfully', 
      count: upcomingBookings.length,
      emailsSent: results.length,
      debug: debugInfo
    });
    
  } catch (error) {
    debugInfo.steps.push('ERROR: ' + error.message);
    debugInfo.error = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };

    console.error('Full error:', error);

    return res.status(500).json({ 
      error: 'Failed to send notifications',
      details: error.message,
      debug: debugInfo
    });
  }
}
