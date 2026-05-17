import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { auth, database } from '@/lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signInAsGuest: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Write user profile to database on login
      if (firebaseUser) {
        try {
          const userRef = ref(database, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          const existing = snapshot.val() || {};
          await set(userRef, {
            ...existing,
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Guest',
            email: firebaseUser.email || null,
            photoURL: firebaseUser.photoURL || null,
            lastLogin: serverTimestamp(),
            createdAt: existing.createdAt || serverTimestamp(),
          });
        } catch (err) {
          console.warn('Could not write user profile:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const signInAsGuest = async () => {
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in as guest');
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signInAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
