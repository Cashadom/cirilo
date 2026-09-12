import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyDBh4tawXhZrQaVjXGsd8oIra7Nk1AcdaE',
  authDomain: 'cirilo-app.firebaseapp.com',
  projectId: 'cirilo-app',
  storageBucket: 'cirilo-app.firebasestorage.app',
  messagingSenderId: '728270487305',
  appId: '1:728270487305:web:5d06101a827f7e9cb15dd8',
  measurementId: 'G-RZ6SCQW114',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app, 'europe-west1')
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
