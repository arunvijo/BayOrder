import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

// Firebase configuration from Gemini global variables
// const firebaseConfig = {
//   apiKey: (window as any).__firebase_api_key,
//   authDomain: (window as any).__firebase_auth_domain,
//   projectId: (window as any).__firebase_project_id,
//   storageBucket: (window as any).__firebase_storage_bucket,
//   messagingSenderId: (window as any).__firebase_messaging_sender_id,
//   appId: (window as any).__firebase_app_id,
// };
const firebaseConfig = {
  apiKey: "AIzaSyDyst-f4bS6pIq8ujmJfNVH8FXt7lM6ud8",
  authDomain: "bayorder-b238f.firebaseapp.com",
  projectId: "bayorder-b238f",
  storageBucket: "bayorder-b238f.firebasestorage.app",
  messagingSenderId: "486743571543",
  appId: "1:486743571543:web:4f0719a53e1cbda1d03712",
  measurementId: "G-5YY1S4K2QK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize authentication with provided token
export const initializeAuth = async () => {
  const initialToken = (window as any).__initial_auth_token;
  if (initialToken && auth.currentUser === null) {
    try {
      await signInWithCustomToken(auth, initialToken);
      console.log('Authentication successful');
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  }
};

// REMOVED getAppId() and getBasePath()