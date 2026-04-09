import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.detail || err.message || 'Something went wrong'
    return Promise.reject(new Error(msg))
  }
)

export const generateResume = (rawInput, jobRole = '', template = 'minimal') =>
  api.post('/generate-resume', { raw_input: rawInput, job_role: jobRole, template })

export const improveSection = (section, content, jobRole = '') =>
  api.post('/improve-section', { section, content, job_role: jobRole })

export default api
