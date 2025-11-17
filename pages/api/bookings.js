import { kv } from '@vercel/kv';

const BOOKINGS_KEY = 'apartment-bookings';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    if (req.method === 'GET') {
      const bookings = await kv.get(BOOKINGS_KEY) || [];
      return res.status(200).json(bookings);
    }

    if (req.method === 'POST') {
      const { apartment, checkIn, checkOut } = req.body;
      
      if (!apartment || !checkIn || !checkOut) {
        return res.status(400).json({ error: 'Λείπουν απαιτούμενα πεδία' });
      }

      const newBooking = {
        id: Date.now(),
        apartment,
        checkIn,
        checkOut,
        createdAt: new Date().toISOString()
      };

      const bookings = await kv.get(BOOKINGS_KEY) || [];
      bookings.push(newBooking);
      await kv.set(BOOKINGS_KEY, bookings);
      
      return res.status(201).json(newBooking);
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.url.split('/').pop());
      const bookings = await kv.get(BOOKINGS_KEY) || [];
      const updatedBookings = bookings.filter(b => b.id !== id);
      await kv.set(BOOKINGS_KEY, updatedBookings);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Σφάλμα βάσης δεδομένων' });
  }
}
