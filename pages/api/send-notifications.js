import Resend from 'resend';
import { neon } from '@neondatabase/serverless';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // This endpoint should be called by a cron job
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Get bookings that check in 2 days from now
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const targetDate = twoDaysFromNow.toISOString().split('T')[0];
    
    const upcomingBookings = await sql`
      SELECT * FROM bookings 
      WHERE check_in = ${targetDate}
    `;

    if (upcomingBookings.length === 0) {
      return res.status(200).json({ message: 'No bookings in 2 days' });
    }

    // Send email for each booking
    const emailPromises = upcomingBookings.map(async (booking) => {
      const apartmentName = booking.apartment === '1' ? 'Αριστερό' : 'Δεξί';
      
      return resend.emails.send({
        from: 'Κρατήσεις <onboarding@resend.dev>', // Change this after domain verification
        to: process.env.NOTIFICATION_EMAIL,
        subject: `🔔 Υπενθύμιση: Κράτηση σε 2 μέρες`,
        html: `
          <h2>Υπενθύμιση Κράτησης</h2>
          <p><strong>Σε 2 μέρες έχετε κράτηση!</strong></p>
          <hr />
          <p><strong>Όνομα:</strong> ${booking.booking_name || 'Χωρίς όνομα'}</p>
          <p><strong>Διαμέρισμα:</strong> ${apartmentName}</p>
          <p><strong>Άφιξη:</strong> ${new Date(booking.check_in).toLocaleDateString('el-GR')}</p>
          <p><strong>Αναχώρηση:</strong> ${new Date(booking.check_out).toLocaleDateString('el-GR')}</p>
          <p><strong>Άτομα:</strong> ${booking.adults || 0} ενήλικες, ${booking.kids || 0} παιδιά</p>
          <hr />
          <p style="color: #666; font-size: 12px;">ID Κράτησης: #${booking.id}</p>
        `
      });
    });

    await Promise.all(emailPromises);

    return res.status(200).json({ 
      message: 'Notifications sent', 
      count: upcomingBookings.length 
    });
    
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ 
      error: 'Failed to send notifications',
      details: error.message 
    });
  }
}
