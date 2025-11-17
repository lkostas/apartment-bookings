import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const bookingId = parseInt(id);

  if (!bookingId || isNaN(bookingId)) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'DELETE') {
      console.log('Deleting booking with ID:', bookingId);
      
      const result = await sql`DELETE FROM bookings WHERE id = ${bookingId} RETURNING id`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      return res.status(200).json({ success: true, deleted: bookingId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Σφάλμα βάσης δεδομένων',
      details: error.message 
    });
  }
}
