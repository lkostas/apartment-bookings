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
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('el-GR', {
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
      <div className="max-w-7xl mx-auto">
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
