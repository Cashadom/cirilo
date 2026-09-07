import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { ensureUserProfile } from '../services/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (user) => {
    if (!user) {
      setProfile(null)
      return null
    }

    const nextProfile = await ensureUserProfile(user)
    setProfile(nextProfile)
    return nextProfile
  }

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      async (user) => {
        setFirebaseUser(user)

        if (!user) {
          setProfile(null)
          setLoading(false)
          return
        }

        try {
          await loadProfile(user)
        } catch (error) {
          console.error('Could not load Cirilo profile:', error)
        } finally {
          setLoading(false)
        }
      }
    )
  }, [])

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,

      signInGoogle: async () => {
        const result = await signInWithPopup(
          auth,
          googleProvider
        )

        await loadProfile(result.user)
        return result.user
      },

      signInEmail: async (email, password) => {
        const result = await signInWithEmailAndPassword(
          auth,
          email,
          password
        )

        await loadProfile(result.user)
        return result.user
      },

      signUpEmail: async ({
        name,
        email,
        password,
      }) => {
        const result =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          )

        const cleanName = name.trim()

        if (cleanName) {
          await updateProfile(result.user, {
            displayName: cleanName,
          })
        }

        await sendEmailVerification(result.user)
        await loadProfile(result.user)

        return result.user
      },

      resetPassword: (email) =>
        sendPasswordResetEmail(auth, email),

      refreshProfile: async () => {
        if (!auth.currentUser) return null
        return loadProfile(auth.currentUser)
      },

      logout: () => signOut(auth),
    }),
    [firebaseUser, profile, loading]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    )
  }

  return context
}
