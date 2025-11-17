import { Resend } from 'resend';
import { neon } from '@neondatabase/serverless';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Allow both GET and POST for testing
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Get bookings that check in 2 days from now
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const targetDate = twoDaysFromNow.toISOString().split('T')[0];
    
    console.log('Checking for bookings on:', targetDate);
    
    const upcomingBookings = await sql`
      SELECT * FROM bookings 
      WHERE check_in = ${targetDate}
    `;

    console.log('Found bookings:', upcomingBookings.length);

    if (upcomingBookings.length === 0) {
      return res.status(200).json({ 
        message: 'No bookings in 2 days',
        count: 0,
        targetDate: targetDate
      });
    }

    // Check if notification email is configured
    if (!process.env.NOTIFICATION_EMAIL) {
      return res.status(500).json({ 
        error: 'NOTIFICATION_EMAIL not configured',
        details: 'Please add NOTIFICATION_EMAIL to environment variables'
      });
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ 
        error: 'RESEND_API_KEY not configured',
        details: 'Please add RESEND_API_KEY to environment variables'
      });
    }

    // Send email for each booking
    const emailPromises = upcomingBookings.map(async (booking) => {
      const apartmentName = booking.apartment === '1' ? 'Αριστερό' : 'Δεξί';
      const checkInDate = new Date(booking.check_in);
      const checkOutDate = new Date(booking.check_out);
      
      return resend.emails.send({
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
    });

    const results = await Promise.all(emailPromises);
    console.log('Emails sent:', results.length);

    return res.status(200).json({ 
      message: 'Notifications sent successfully', 
      count: upcomingBookings.length,
      targetDate: targetDate,
      to: process.env.NOTIFICATION_EMAIL
    });
    
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ 
      error: 'Failed to send notifications',
      details: error.message,
      stack: error.stack
    });
  }
}
