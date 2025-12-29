import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    projectId: "poppin-80886",
    // Other fields are generally not strictly required for basic Firestore access if initialized on the backend/web within some contexts,
    // but for mobile/web apps we usually need more. However, for this POC and project status, we'll start with what we have.
    // In a real app, we'd add apiKey, authDomain, etc.
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
