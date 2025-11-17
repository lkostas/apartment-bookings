import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id BIGINT PRIMARY KEY,
        apartment VARCHAR(10) NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM bookings ORDER BY check_in ASC`;
      
      const bookings = rows.map(row => ({
        id: Number(row.id),
        apartment: row.apartment,
        checkIn: row.check_in,
        checkOut: row.check_out,
        createdAt: row.created_at
      }));
      
      return res.status(200).json(bookings);
    }

    if (req.method === 'POST') {
      const { apartment, checkIn, checkOut } = req.body;
      
      if (!apartment || !checkIn || !checkOut) {
        return res.status(400).json({ error: 'Λείπουν απαιτούμενα πεδία' });
      }

      const id = Date.now();
      
      await sql`
        INSERT INTO bookings (id, apartment, check_in, check_out)
        VALUES (${id}, ${apartment}, ${checkIn}, ${checkOut})
      `;
      
      const newBooking = {
        id,
        apartment,
        checkIn,
        checkOut,
        createdAt: new Date().toISOString()
      };
      
      return res.status(201).json(newBooking);
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
