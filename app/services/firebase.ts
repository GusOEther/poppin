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

import { USE_EMULATOR, getEmulatorHost } from './env';

if (USE_EMULATOR) {
    const host = getEmulatorHost();
    console.log(`[Firebase] Connecting to Firestore Emulator at ${host}`);
    connectFirestoreEmulator(db, host, 8080);
}
