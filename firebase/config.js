// FILE: firebase/config.js
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCBIpBCmKxiu3E5-Nls6tfo5xwgsBO12-8",
  authDomain: "studio-9916723566-5e1ef.firebaseapp.com",
  databaseURL: "https://studio-9916723566-5e1ef-default-rtdb.firebaseio.com",
  projectId: "studio-9916723566-5e1ef",
  storageBucket: "studio-9916723566-5e1ef.firebasestorage.app",
  messagingSenderId: "1034137410813",
  appId: "1:1034137410813:web:5e6e3d825a310b3994f294"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { app, db, auth };
