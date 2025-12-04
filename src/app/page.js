'use client';

import { useState, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  setDoc,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function Home() {
  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [generatedId, setGeneratedId] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    gender: '',
    surname: '',
    firstName: '',
    city: '',
    day: '',
    month: '',
    year: '',
    organization: ''
  });

  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
    }

    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
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
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'normal'
        });
        window.recaptchaVerifier.render();
      }
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
      setError('');
    } catch (err) {
      setError('Wrong OTP. Please try again.');
    }
    setLoading(false);
  };

  const generateMemberId = async (gender) => {
    try {
      const counterRef = doc(db, 'counters', 'memberId');
      
      const newId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let currentCount = 1;
        if (counterDoc.exists()) {
          currentCount = counterDoc.data().count + 1;
        }
        
        transaction.set(counterRef, { count: currentCount });
        
        const genderPrefix = gender === 'Male' ? 'M' : 'F';
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const paddedCount = String(currentCount).padStart(6, '0');
        
        return `D${genderPrefix}${paddedCount}${currentYear}`;
      });
      
      return newId;
    } catch (err) {
      console.error('Error generating member ID:', err);
      throw err;
    }
  };

  const handleFormSubmit = async () => {
    const { gender, surname, firstName, city, day, month, year } = formData;
    
    if (!gender || !surname || !firstName || !city || !day || !month || !year) {
      setError('Please fill all required fields');
      return;
    }

    if (!auth.currentUser) {
      setError('Authentication error. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const memberId = await generateMemberId(gender);
      
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDocRef, {
        memberId: memberId,
        title: formData.title,
        gender: gender,
        surname,
        firstName,
        fullName: `${formData.title} ${firstName} ${surname}`.trim(),
        city,
        dob: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        organization: formData.organization || 'Not provided',
        phoneNumber: `+91${phoneNumber}`,
        timestamp: new Date(),
        userId: auth.currentUser.uid
      });
      
      setGeneratedId(memberId);
      setStep('success');
    } catch (err) {
      console.error('Error saving:', err);
      setError('Failed to save. Please try again.');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          
          {/* Header */}
          <div className="text-center pt-8 px-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <svg className="w-9 h-9 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">DBAVMK Registration</h1>
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
                      placeholder="9999988888"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div id="recaptcha-container" className="flex justify-center"></div>

                {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

                <button
                  onClick={handleSendOTP}
                  disabled={loading || phoneNumber.length !== 10}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </div>
            )}

            {/* OTP Step */}
            {step === 'otp' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                    Enter 6-digit OTP sent to +91 {phoneNumber}
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg text-center text-2xl tracking-widest text-black focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg text-center">{error}</p>}

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <button onClick={() => setStep('phone')} className="w-full text-indigo-600 font-medium text-sm hover:underline">
                  ← Change Number
                </button>
              </div>
            )}

            {/* Form Step */}
            {step === 'form' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                    <select 
                      name="title" 
                      value={formData.title} 
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option>Mr</option>
                      <option>Ms</option>
                      <option>Mrs</option>
                      <option>Dr</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
                    <select 
                      name="gender" 
                      value={formData.gender} 
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                    <input 
                      type="text" 
                      name="firstName" 
                      value={formData.firstName} 
                      onChange={handleChange} 
                      placeholder="John" 
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Surname *</label>
                    <input 
                      type="text" 
                      name="surname" 
                      value={formData.surname} 
                      onChange={handleChange} 
                      placeholder="Doe" 
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
                  <input 
                    type="text" 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange} 
                    placeholder="Mumbai" 
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth *</label>
                  <div className="grid grid-cols-3 gap-3">
                    <select 
                      name="day" 
                      value={formData.day} 
                      onChange={handleChange} 
                      className="px-3 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Day</option>
                      {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select 
                      name="month" 
                      value={formData.month} 
                      onChange={handleChange} 
                      className="px-3 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Month</option>
                      {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select 
                      name="year" 
                      value={formData.year} 
                      onChange={handleChange} 
                      className="px-3 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Year</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Organization (Optional)</label>
                  <input 
                    type="text" 
                    name="organization" 
                    value={formData.organization} 
                    onChange={handleChange} 
                    placeholder="Company or Institution" 
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>

                {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg text-center">{error}</p>}

                <button
                  onClick={handleFormSubmit}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'Saving...' : 'Complete Registration'}
                </button>
              </div>
            )}

            {/* Success */}
            {step === 'success' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Registration Complete!</h2>
                <p className="text-gray-600 mb-6">Your member ID has been generated</p>
                
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 mb-4">
                  <p className="text-sm text-gray-600 mb-2">Your Member ID</p>
                  <p className="text-4xl font-bold text-indigo-600 tracking-wider">{generatedId}</p>
                </div>
                
                <p className="text-sm text-gray-500">Please save this ID for future reference</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}