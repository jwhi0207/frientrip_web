import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBfd04k8A9P2ib3CyXKanbp0qzcNjgQP9I",
  authDomain: "frientrip-1e322.firebaseapp.com",
  projectId: "frientrip-1e322",
  storageBucket: "frientrip-1e322.firebasestorage.app",
  messagingSenderId: "227024772331",
  appId: "1:227024772331:web:3d6d3f2d0f942eda30b2ae",
  measurementId: "G-MX6L0JXWDW",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
