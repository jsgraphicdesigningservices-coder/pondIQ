import { initializeApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { getAuth, signInAnonymously, Auth, onAuthStateChanged, User } from "firebase/auth";

// Firebase configuration - uses environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "iot-aquaculture-monitoring.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://iot-aquaculture-monitoring-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "iot-aquaculture-monitoring",
};

let app: FirebaseApp | null = null;
let database: Database | null = null;
let auth: Auth | null = null;
let currentUser: User | null = null;
let authReady: Promise<User | null>;
let firebaseConfigured = false;

// Check if Firebase is properly configured
const hasValidConfig = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyDemoKey";

if (hasValidConfig) {
  try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    firebaseConfigured = true;
    
    // Create a promise that resolves when auth state is determined
    authReady = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth!, (user) => {
        currentUser = user;
        if (user) {
          if (import.meta.env.DEV) {
            console.log("Firebase authenticated:", user.uid);
          }
          resolve(user);
        } else {
          // Sign in anonymously if not authenticated
          signInAnonymously(auth!)
            .then((credential) => {
              currentUser = credential.user;
              if (import.meta.env.DEV) {
                console.log("Firebase anonymous auth success:", credential.user.uid);
              }
              resolve(credential.user);
            })
            .catch((error) => {
              console.warn("Firebase anonymous auth failed (check API key):", error.code);
              resolve(null);
            });
        }
        unsubscribe();
      });
    });

    if (import.meta.env.DEV) {
      console.log("Firebase initialized successfully");
    }
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
    firebaseConfigured = false;
    authReady = Promise.resolve(null);
  }
} else {
  // Firebase not configured - app will run without real-time features
  console.info(
    "Firebase not configured. Set VITE_FIREBASE_API_KEY environment variable to enable real-time features."
  );
  authReady = Promise.resolve(null);
}

// Helper to ensure auth is ready before operations
export async function ensureAuth(): Promise<User | null> {
  return authReady;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function isFirebaseConfigured(): boolean {
  return firebaseConfigured;
}

export { app, database, auth };

// --- ADDED: Stubs for FirebaseStatus compatibility ---
let _firebaseAuthError: string | null = null;

/**
 * Returns the last Firebase Auth error code, if any. Used by FirebaseStatus.
 */
export function getFirebaseAuthError(): string | null {
  return _firebaseAuthError;
}

/**
 * Clears the flag that disables anonymous auth. Used by FirebaseStatus.
 */
export function clearFirebaseAnonymousAuthDisabledFlag() {
  _firebaseAuthError = null;
}
