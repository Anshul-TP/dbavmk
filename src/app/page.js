
'use client';

import { useState, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function Home() {
  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  const [formData, setFormData] = useState({
    title: 'Mr',
    surname: '',
    firstName: '',
    city: '',
    day: '',
    month: '',
    year: '',
    organization: ''
  });

  useEffect(() => {
    // Mobile viewport fix + prevent zoom on input
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
    }

    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible', // Better for mobile
        callback: () => console.log('reCAPTCHA solved'),
        'expired-callback': () => console.log('reCAPTCHA expired')
      });
      window.recaptchaVerifier.render();
    }
  }, []);

  const handleSendOTP = async () => {
    setError('');
    if (phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit number');
      return;
    }

    try {
      const q = query(collection(db, 'users'), where('phoneNumber', '==', `+91${phoneNumber}`));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setError('This phone number is already registered');
        return;
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Try again.');
      window.recaptchaVerifier?.clear();
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Enter valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      setStep('form');
    } catch (err) {
      setError('Wrong OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleFormSubmit = async () => {
    const { surname, firstName, city, day, month, year } = formData;
    if (!surname || !firstName || !city || !day || !month || !year) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'users'), {
        title: formData.title,
        surname,
        firstName,
        fullName: `${formData.title} ${firstName} ${surname}`,
        city,
        dob: `${year}-${month}-${day}`,
        organization: formData.organization || 'Not provided',
        phoneNumber: `+91${phoneNumber}`,
        timestamp: new Date(),
        userId: auth.currentUser?.uid || null
      });
      setStep('success');
    } catch (err) {
      setError('Failed to save. Try again.');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // DOB Data
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      {/* Full mobile-friendly viewport */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
            
            {/* Header */}
            <div className="text-center pt-8 px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                <svg className="w-9 h-9 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Register</h1>
              <p className="text-gray-600 text-sm mt-2">
                {step === 'phone' && 'Enter your phone number'}
                {step === 'otp' && 'Verify OTP'}
                {step === 'form' && 'Complete your profile'}
                {step === 'success' && 'Welcome!'}
              </p>
            </div>

            <div className="px-6 pt-6 pb-8">

              {/* Phone Step */}
              {step === 'phone' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-4 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700 font-medium">+91</span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="99999 88888"
                        className="flex-1 px-4 py-4 border border-gray-300 rounded-r-lg text-black text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div id="recaptcha-container"></div>

                  {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

                  <button
                    onClick={handleSendOTP}
                    disabled={loading || phoneNumber.length !== 10}
                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </div>
              )}

              {/* OTP Step */}
              {step === 'otp' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                      Enter 6-digit OTP sent to +91 {phoneNumber}
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="—— ———"
                      className="w-full px-4 py-5 border-2 border-gray-300 rounded-xl text-center text-3xl font-bold tracking-widest text-black focus:border-indigo-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg text-center">{error}</p>}

                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </button>

                  <button onClick={() => setStep('phone')} className="text-indigo-600 font-medium">
                    ← Change Number
                  </button>
                </div>
              )}

              {/* Form Step */}
              {step === 'form' && (
                <div className="space-y-5 text-sm">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-2">Title</label>
                    <select name="title" value={formData.title} onChange={handleChange}
                      className="w-full px-4 py-4 border border-gray-300 rounded-lg text-black text-base">
                      <option>Mr</option>
                      <option>Ms</option>
                      <option>Mrs</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-2">Surname *</label>
                      <input type="text" name="surname" value={formData.surname} onChange={handleChange} placeholder="Sharma" className="w-full px-4 py-4 border rounded-lg text-black" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-2">First Name *</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Priya" className="w-full px-4 py-4 border rounded-lg text-black" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-2">City You Live In *</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Delhi" className="w-full px-4 py-4 border rounded-lg text-black" />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-2">Date of Birth *</label>
                    <div className="grid grid-cols-3 gap-3">
                      <select name="day" value={formData.day} onChange={handleChange} className="px-3 py-4 border rounded-lg text-black">
                        <option>Day</option>
                        {days.map(d => <option key={d}>{d}</option>)}
                      </select>
                      <select name="month" value={formData.month} onChange={handleChange} className="px-3 py-4 border rounded-lg text-black">
                        <option>Month</option>
                        {months.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                      </select>
                      <select name="year" value={formData.year} onChange={handleChange} className="px-3 py-4 border rounded-lg text-black">
                        <option>Year</option>
                        {years.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-2">Working Organization (Optional)</label>
                    <input type="text" name="organization" value={formData.organization} onChange={handleChange} placeholder="Google, Freelancer, etc." className="w-full px-4 py-4 border rounded-lg text-black" />
                  </div>

                  {error && <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg text-center">{error}</p>}

                  <button
                    onClick={handleFormSubmit}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Saving...' : 'Complete Registration'}
                  </button>
                </div>
              )}

              {/* Success */}
              {step === 'success' && (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">You are all set!</h2>
                  <p className="text-gray-600">Registration completed successfully.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}