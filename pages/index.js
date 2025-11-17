import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export default function ApartmentBooking() {
  const [bookings, setBookings] = useState([]);
  const [selectedApartment, setSelectedApartment] = useState('1');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = '/api/bookings';

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Αποτυχία φόρτωσης');
      const data = await response.json();
      setBookings(data);
      setError('');
    } catch (err) {
      setError('Σφάλμα φόρτωσης. Δοκιμάστε να ανανεώσετε τη σελίδα.');
    } finally {
      setLoading(false);
    }
  };

  const addBooking = async () => {
    if (!checkIn || !checkOut) {
      alert('Παρακαλώ επιλέξτε και τις δύο ημερομηνίες');
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      alert('Η ημερομηνία αναχώρησης πρέπει να είναι μετά την άφιξη');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apartment: selectedApartment,
          checkIn,
          checkOut
        }),
      });

      if (!response.ok) throw new Error('Αποτυχία προσθήκης');
      
      const savedBooking = await response.json();
      setBookings([...bookings, savedBooking]);
      setCheckIn('');
      setCheckOut('');
      alert('Η κράτηση προστέθηκε επιτυχώς!');
    } catch (err) {
      alert('Σφάλμα κατά την προσθήκη. Παρακαλώ δοκιμάστε ξανά.');
    }
  };

  const deleteBooking = async (id) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την κράτηση;')) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Αποτυχία διαγραφής');
      setBookings(bookings.filter(b => b.id !== id));
    } catch (err) {
      alert('Σφάλμα κατά τη διαγραφή.');
    }
  };

  const getBookingsForApartment = (apartmentId) => {
    return bookings
      .filter(b => b.apartment === apartmentId)
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Φόρτωση κρατήσεων...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Σύστημα Κρατήσεων Διαμερισμάτων</h1>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Προσθήκη Νέας Κράτησης</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Διαμέρισμα</label>
                <select
                  value={selectedApartment}
                  onChange={(e) => setSelectedApartment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">Διαμέρισμα 1</option>
                  <option value="2">Διαμέρισμα 2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ημερομηνία Άφιξης</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ημερομηνία Αναχώρησης</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={addBooking}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg"
                >
                  Προσθήκη Κράτησης
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['1', '2'].map(apartmentId => {
            const apartmentBookings = getBookingsForApartment(apartmentId);
            
            return (
              <div key={apartmentId} className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-3 border-b-2 border-indigo-200">
                  Διαμέρισμα {apartmentId}
                </h2>

                {apartmentBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Δεν υπάρχουν κρατήσεις ακόμα</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apartmentBookings.map(booking => (
                      <div key={booking.id} className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-indigo-800 mb-2">
                              Κράτηση #{booking.id}
                            </div>
                            <div className="text-gray-700">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">Άφιξη:</span>
                                <span>{formatDate(booking.checkIn)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Αναχώρηση:</span>
                                <span>{formatDate(booking.checkOut)}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteBooking(booking.id)}
                            className="text-red-500 hover:text-red-700 font-medium text-sm px-3 py-1 rounded hover:bg-red-50"
                          >
                            Διαγραφή
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-4 text-sm text-gray-600 text-center">
          <strong>Σημείωση:</strong> Όλες οι κρατήσεις είναι κοινές για όλους τους χρήστες.
        </div>
      </div>
    </div>
  );
}
