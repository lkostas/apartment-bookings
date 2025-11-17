import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Create table if doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id BIGINT PRIMARY KEY,
        apartment VARCHAR(10) NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add missing columns if they don't exist
    try {
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 0`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS kids INTEGER DEFAULT 0`;
    } catch (alterError) {
      console.log('Columns might already exist:', alterError.message);
    }

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM bookings ORDER BY check_in ASC`;
      
      const bookings = rows.map(row => {
        const checkInDate = new Date(row.check_in);
        const checkOutDate = new Date(row.check_out);
        
        return {
          id: Number(row.id),
          apartment: row.apartment,
          checkIn: checkInDate.toISOString().split('T')[0],
          checkOut: checkOutDate.toISOString().split('T')[0],
          adults: row.adults || 0,
          kids: row.kids || 0,
          createdAt: row.created_at
        };
      });
      
      return res.status(200).json(bookings);
    }

    if (req.method === 'POST') {
      const { apartment, checkIn, checkOut, adults, kids } = req.body;
      
      if (!apartment || !checkIn || !checkOut) {
        return res.status(400).json({ error: 'Λείπουν απαιτούμενα πεδία' });
      }

      const id = Date.now();
      const numAdults = parseInt(adults) || 0;
      const numKids = parseInt(kids) || 0;
      
      await sql`
        INSERT INTO bookings (id, apartment, check_in, check_out, adults, kids)
        VALUES (${id}, ${apartment}, ${checkIn}, ${checkOut}, ${numAdults}, ${numKids})
      `;
      
      const newBooking = {
        id,
        apartment,
        checkIn,
        checkOut,
        adults: numAdults,
        kids: numKids,
        createdAt: new Date().toISOString()
      };
      
      return res.status(201).json(newBooking);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const bookingId = parseInt(id);
      
      if (!bookingId || isNaN(bookingId)) {
        return res.status(400).json({ error: 'Invalid booking ID' });
      }
      
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
