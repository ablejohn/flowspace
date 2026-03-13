import { create } from 'zustand'
import api from '../lib/api'

const useAuthStore = create((set) => ({
  user:  JSON.parse(localStorage.getItem('fs_user') || 'null'),
  token: localStorage.getItem('fs_token') || null,

  login: async ({ email, password }) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('fs_token', res.data.token)
    localStorage.setItem('fs_user', JSON.stringify(res.data.user))
    set({ user: res.data.user, token: res.data.token })
  },

  register: async ({ email, password, fullName }) => {
    const res = await api.post('/auth/register', { email, password, fullName })
    localStorage.setItem('fs_token', res.data.token)
    localStorage.setItem('fs_user', JSON.stringify(res.data.user))
    set({ user: res.data.user, token: res.data.token })
  },

  logout: () => {
    localStorage.removeItem('fs_token')
    localStorage.removeItem('fs_user')
    set({ user: null, token: null })
  }
}))

export default useAuthStore
