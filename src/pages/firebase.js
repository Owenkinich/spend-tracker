import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDsgAYalwbNhcvSoiTW7FNHeZsN1mJW7hA",
  authDomain: "spendtracker-be68a.firebaseapp.com",
  projectId: "spendtracker-be68a",
  storageBucket: "spendtracker-be68a.firebasestorage.app",
  messagingSenderId: "307171747504",
  appId: "1:307171747504:web:41a94fcc541d05452c7d75",
  measurementId: "G-G0R546X57L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export these so we can use them in our Login and Dashboard pages
export const auth = getAuth(app);
export const db = getFirestore(app);