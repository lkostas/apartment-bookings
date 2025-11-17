import { Redis } from '@upstash/redis';

const BOOKINGS_KEY = 'apartment-bookings';

// Parse REDIS_URL to extract components
const redisUrl = process.env.REDIS_URL;
let redis;

if (redisUrl) {
  // Extract host, port, and password from redis://default:password@host:port format
  const match = redisUrl.match(/redis:\/\/(?:.*?):(.+?)@(.+?):(\d+)/);
  if (match) {
    const [, password, host, port] = match;
    redis = new Redis({
      url: `http://${host}:${port}`, // Changed to http:// instead of https://
      token: password,
    });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!redis) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    if (req.method === 'GET') {
      let bookings = await redis.get(BOOKINGS_KEY);
      if (!bookings) {
        bookings = [];
        await redis.set(BOOKINGS_KEY, JSON.stringify(bookings));
      } else if (typeof bookings === 'string') {
        bookings = JSON.parse(bookings);
      }
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

      let bookings = await redis.get(BOOKINGS_KEY);
      if (!bookings) {
        bookings = [];
      } else if (typeof bookings === 'string') {
        bookings = JSON.parse(bookings);
      }
      
      bookings.push(newBooking);
      await redis.set(BOOKINGS_KEY, JSON.stringify(bookings));
      
      return res.status(201).json(newBooking);
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.url.split('/').pop());
      
      let bookings = await redis.get(BOOKINGS_KEY);
      if (!bookings) {
        bookings = [];
      } else if (typeof bookings === 'string') {
        bookings = JSON.parse(bookings);
      }
      
      const updatedBookings = bookings.filter(b => b.id !== id);
      await redis.set(BOOKINGS_KEY, JSON.stringify(updatedBookings));
      
      return res.status(200).json({ success: true });
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
