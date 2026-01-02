import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAk1e08GUGaLGUpuHHBC_2nY3WfHLlfneI",
    authDomain: "poppin-80886.firebaseapp.com",
    projectId: "poppin-80886",
    storageBucket: "poppin-80886.firebasestorage.app",
    messagingSenderId: "218826637578",
    appId: "1:218826637578:web:60d06dc880d5e988ad7af3",
    measurementId: "G-5EL7E9ZQBW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Switch between Emulator and Production
const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_EMULATOR !== 'false';
const EMULATOR_HOST = process.env.EXPO_PUBLIC_FIREBASE_HOST || 'localhost';

if (USE_EMULATOR) {
    console.log(`[Firebase] Connecting to Firestore Emulator at ${EMULATOR_HOST}`);
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
}
