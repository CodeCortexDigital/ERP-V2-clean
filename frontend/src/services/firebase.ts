import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC1gw8qm5afn9flLNkRe1haJlh9doLZzRc",
  authDomain: "school-erp-c53b4.firebaseapp.com",
  projectId: "school-erp-c53b4",
  storageBucket: "school-erp-c53b4.firebasestorage.app",
  messagingSenderId: "1072376185780",
  appId: "1:1072376185780:web:d6ba721d39d9b3bc7c28e1",
  measurementId: "G-WMRN7QPFL9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure custom scopes / prompts if necessary
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async (): Promise<string> => {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return idToken;
};
