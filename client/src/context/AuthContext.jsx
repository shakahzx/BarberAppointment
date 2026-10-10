import { useEffect, useState } from 'react'
import { AuthContext } from './auth'
import api from '../services/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('barber-token')))

  useEffect(() => {
    if (!localStorage.getItem('barber-token')) return
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('barber-token'))
      .finally(() => setLoading(false))
  }, [])

  async function authenticate(path, details) {
    const { data } = await api.post(`/auth/${path}`, details)
    localStorage.setItem('barber-token', data.token)
    setUser(data.user)
    return data.user
  }

  async function register(details) {
    const { data } = await api.post('/auth/register', details)
    return data
  }

  async function verifyEmail(details) {
    const { data } = await api.post('/auth/verify-email', details)
    localStorage.setItem('barber-token', data.token)
    setUser(data.user)
    return data.user
  }

  async function resendVerification(email) {
    const { data } = await api.post('/auth/resend-verification', { email })
    return data
  }

  function logout() {
    localStorage.removeItem('barber-token')
    setUser(null)
  }

  async function updateProfile(details) {
    const { data } = await api.put('/auth/profile', details)
    setUser(data.user)
    return data.user
  }

  return <AuthContext.Provider value={{ user, loading, login: (details) => authenticate('login', details), register, verifyEmail, resendVerification, logout, updateProfile }}>{children}</AuthContext.Provider>
}