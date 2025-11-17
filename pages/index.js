import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export default function ApartmentBooking() {
  const [bookings, setBookings] = useState([]);
  const [selectedApartment, setSelectedApartment] = useState('1');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(0);
  const [kids, setKids] = useState(0);
  const [bookingName, setBookingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [conflictWarning, setConflictWarning] = useState('');
  const [testingNotification, setTestingNotification] = useState(false);

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
      console.error('Load error:', err);
      setError('Σφάλμα φόρτωσης. Δοκιμάστε να ανανεώσετε τη σελίδα.');
    } finally {
      setLoading(false);
    }
  };

  const testNotifications = async () => {
    if (!confirm('Θα σταλεί δοκιμαστικό email ειδοποίησης. Συνεχίζετε;')) {
      return;
    }

    setTestingNotification(true);
    try {
      const response = await fetch('/api/send-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ Επιτυχία! Στάλθηκαν ${data.count || 0} ειδοποιήσεις.\n\nΕλέγξτε το email σας!`);
      } else {
        alert(`❌ Σφάλμα: ${data.error}\n\n${data.details || ''}`);
      }
    } catch (err) {
      alert(`❌ Σφάλμα δικτύου: ${err.message}`);
    } finally {
      setTestingNotification(false);
    }
  };

  const checkDateConflict = (apartment, newCheckIn, newCheckOut, excludeId = null) => {
    const newStart = new Date(newCheckIn);
    const newEnd = new Date(newCheckOut);

    const conflicts = bookings.filter(booking => {
      if (excludeId && booking.id === excludeId) return false;
      if (booking.apartment !== apartment) return false;

      const existingStart = new Date(booking.checkIn);
      const existingEnd = new Date(booking.checkOut);

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });

    return conflicts;
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

    const conflicts = checkDateConflict(selectedApartment, checkIn, checkOut, editingId);
    
    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(c => 
        `${c.bookingName || 'Κράτηση #' + c.id}: ${formatDate(c.checkIn)} - ${formatDate(c.checkOut)}`
      ).join('\n');
      
      const confirmOverlap = confirm(
        `⚠️ ΠΡΟΣΟΧΗ: Οι ημερομηνίες επικαλύπτονται με υπάρχουσα κράτηση!\n\n${conflictMessages}\n\nΘέλετε να συνεχίσετε ούτως ή άλλως;`
      );
      
      if (!confirmOverlap) {
        return;
      }
    }

    try {
      if (editingId) {
        await updateBooking();
      } else {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apartment: selectedApartment,
            checkIn,
            checkOut,
            adults,
            kids,
            bookingName
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Add error:', errorData);
          throw new Error('Αποτυχία προσθήκης');
        }
        
        const savedBooking = await response.json();
        setBookings([...bookings, savedBooking]);
        alert('Η κράτηση προστέθηκε επιτυχώς!');
      }
      
      resetForm();
      await loadBookings();
    } catch (err) {
      console.error('Error:', err);
      alert('Σφάλμα κατά την προσθήκη. Παρακαλώ δοκιμάστε ξανά.');
    }
  };

  const updateBooking = async () => {
    try {
      const deleteResponse = await fetch(`${API_URL}?id=${editingId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!deleteResponse.ok) {
        throw new Error('Αποτυχία διαγραφής παλιάς κράτησης');
      }

      const addResponse = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apartment: selectedApartment,
          checkIn,
          checkOut,
          adults,
          kids,
          bookingName
        }),
      });

      if (!addResponse.ok) throw new Error('Αποτυχία ενημέρωσης');
      
      alert('Η κράτηση ενημερώθηκε επιτυχώς!');
    } catch (err) {
      console.error('Update error:', err);
      alert('Σφάλμα κατά την ενημέρωση. Παρακαλώ δοκιμάστε ξανά.');
      throw err;
    }
  };

  const editBooking = (booking) => {
    setEditingId(booking.id);
    setSelectedApartment(booking.apartment);
    setCheckIn(booking.checkIn);
    setCheckOut(booking.checkOut);
    setAdults(booking.adults || 0);
    setKids(booking.kids || 0);
    setBookingName(booking.bookingName || '');
    setConflictWarning('');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setCheckIn('');
    setCheckOut('');
    setAdults(0);
    setKids(0);
    setBookingName('');
    setSelectedApartment('1');
    setConflictWarning('');
  };

  const deleteBooking = async (id) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την κράτηση;')) return;

    try {
      const response = await fetch(`${API_URL}?id=${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete error:', errorData);
        throw new Error('Αποτυχία διαγραφής');
      }

      setBookings(bookings.filter(b => b.id !== id));
      
      if (editingId === id) {
        resetForm();
      }
      
      alert('Η κράτηση διαγράφηκε επιτυχώς!');
    } catch (err) {
      console.error('Error:', err);
      alert('Σφάλμα κατά τη διαγραφή. Παρακαλώ δοκιμάστε ξανά.');
    }
  };

  const getBookingsForApartment = (apartmentId) => {
    return bookings
      .filter(b => b.apartment === apartmentId)
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  };

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (checkIn && checkOut && selectedApartment) {
      const conflicts = checkDateConflict(selectedApartment, checkIn, checkOut, editingId);
      if (conflicts.length > 0) {
        const conflictText = conflicts.map(c => 
          `${c.bookingName || 'Κράτηση #' + c.id} (${formatDate(c.checkIn)} - ${formatDate(c.checkOut)})`
        ).join(', ');
        setConflictWarning(`⚠️ Επικάλυψη με: ${conflictText}`);
      } else {
        setConflictWarning('');
      }
    } else {
      setConflictWarning('');
    }
  }, [checkIn, checkOut, selectedApartment, bookings, editingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Φόρτωση κρατήσεων...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Σύστημα Κρατήσεων Διαμερισμάτων</h1>
            </div>
            <button
              onClick={testNotifications}
              disabled={testingNotification}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingNotification ? '⏳ Αποστολή...' : '🔔 Δοκιμή Email'}
            </button>
          </div>

          <div className={`border rounded-lg p-4 mb-6 ${editingId ? 'bg-yellow-50 border-yellow-300' : 'bg-indigo-50 border-indigo-200'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingId ? 'Επεξεργασία Κράτησης' : 'Προσθήκη Νέας Κράτησης'}
              </h2>
              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Ακύρωση
                </button>
              )}
            </div>

            {conflictWarning && (
              <div className="bg-orange-100 border border-orange-400 text-orange-800 px-4 py-3 rounded mb-4 text-sm">
                {conflictWarning}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Όνομα Κράτησης</label>
                <input
                  type="text"
                  value={bookingName}
                  onChange={(e) => setBookingName(e.target.value)}
                  placeholder="π.χ. Γιάννης Παπ."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Διαμέρισμα</label>
                <select
                  value={selectedApartment}
                  onChange={(e) => setSelectedApartment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">Αριστερό</option>
                  <option value="2">Δεξί</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Άφιξη</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Αναχώρηση</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ενήλικες</label>
                <input
                  type="number"
                  min="0"
                  value={adults}
                  onChange={(e) => setAdults(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Παιδιά</label>
                <input
                  type="number"
                  min="0"
                  value={kids}
                  onChange={(e) => setKids(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={addBooking}
                  className={`w-full font-semibold py-2 px-6 rounded-lg ${
                    editingId 
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {editingId ? 'Ενημέρωση' : 'Προσθήκη'}
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
                  {apartmentId === '1' ? 'Διαμέρισμα Αριστερό' : 'Διαμέρισμα Δεξί'}
                </h2>

                {apartmentBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Δεν υπάρχουν κρατήσεις ακόμα</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apartmentBookings.map(booking => (
                      <div 
                        key={booking.id} 
                        className={`rounded-lg p-4 border ${
                          editingId === booking.id 
                            ? 'bg-yellow-100 border-yellow-300' 
                            : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {booking.bookingName && (
                              <div className="text-lg font-bold text-indigo-900 mb-2">
                                {booking.bookingName}
                              </div>
                            )}
                            <div className="text-sm font-semibold text-indigo-800 mb-2">
                              Κράτηση #{booking.id}
                            </div>
                            <div className="text-gray-700">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">Άφιξη:</span>
                                <span>{formatDate(booking.checkIn)}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">Αναχώρηση:</span>
                                <span>{formatDate(booking.checkOut)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Άτομα:</span>
                                <span>{booking.adults || 0} ενήλικες, {booking.kids || 0} παιδιά</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => editBooking(booking)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded hover:bg-blue-50"
                            >
                              Επεξεργασία
                            </button>
                            <button
                              onClick={() => deleteBooking(booking.id)}
                              className="text-red-500 hover:text-red-700 font-medium text-sm px-3 py-1 rounded hover:bg-red-50"
                            >
                              Διαγραφή
                            </button>
                          </div>
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
          <strong>Σημείωση:</strong> Όλες οι κρατήσεις είναι κοινές για όλους τους χρήστες. Ειδοποιήσεις στέλνονται αυτόματα 2 μέρες πριν την άφιξη.
        </div>
      </div>
    </div>
  );
}
