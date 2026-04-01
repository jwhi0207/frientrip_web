"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { UserProfile } from "./models";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_EMAILS = new Set([
  "jwhi0207@gmail.com",
  "benjamincroberts@gmail.com",
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchOrCreateProfile(u: User): Promise<UserProfile> {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    // Create new profile
    const newProfile: UserProfile = {
      uid: u.uid,
      displayName: u.displayName ?? u.email?.split("@")[0] ?? "User",
      email: u.email ?? "",
      avatarSeed: Math.floor(Math.random() * 1000000),
      avatarColor: Math.floor(Math.random() * 16),
      role: ADMIN_EMAILS.has(u.email ?? "") ? "admin" : "user",
    };
    await setDoc(ref, newProfile);
    return newProfile;
  }

  async function checkAndAcceptPendingInvites(u: User) {
    // Import here to avoid circular deps
    const { collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } =
      await import("firebase/firestore");

    if (!u.email) return;

    const tripsRef = collection(db, "trips");
    const q = query(tripsRef, where("pendingInviteEmails", "array-contains", u.email));
    const snap = await getDocs(q);

    for (const tripDoc of snap.docs) {
      const tripRef = doc(db, "trips", tripDoc.id);
      await updateDoc(tripRef, {
        memberIds: arrayUnion(u.uid),
        pendingInviteEmails: arrayRemove(u.email),
      });

      // Create member subcollection doc
      const memberRef = doc(db, "trips", tripDoc.id, "members", u.uid);
      const profileSnap = await getDoc(doc(db, "users", u.uid));
      const p = profileSnap.data() as UserProfile;
      await setDoc(memberRef, {
        uid: u.uid,
        displayName: p.displayName,
        email: p.email,
        avatarSeed: p.avatarSeed,
        avatarColor: p.avatarColor,
        nightsStayed: 0,
        amountPaid: 0,
        pendingPaymentAmount: 0,
        pendingPaymentStatus: "none",
        status: "active",
      });
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await fetchOrCreateProfile(u);
          setProfile(p);
          await checkAndAcceptPendingInvites(u);
        } catch (e) {
          console.error("Error loading profile:", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
  }

  async function loginWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  }

  async function logout() {
    await signOut(auth);
  }

  async function refreshProfile() {
    if (user) {
      const p = await fetchOrCreateProfile(user);
      setProfile(p);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, login, register, loginWithGoogle, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
