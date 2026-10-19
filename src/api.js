import axios from 'axios'

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL
if (!rawBaseUrl) {
  throw new Error('VITE_API_BASE_URL belum dikonfigurasi.')
}
const API_BASE = rawBaseUrl.replace(/\/+$/, '')
const API_ORIGIN = new URL(API_BASE).origin
let outletContextId = null
let accessToken = sessionStorage.getItem('laundrian_access_token') || ''
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { Accept: 'application/json' },
})

export class ApiError extends Error {
  constructor(status, body) {
    const validationMessage = Object.values(body?.errors || {}).flat()[0]
    super(validationMessage || body?.message || 'Permintaan ke server gagal.')
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function requestApi(path, { method = 'GET', body, headers = {} } = {}) {
  const upperMethod = method.toUpperCase()
  const requestHeaders = { ...headers }
  if (accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`
  if (outletContextId) requestHeaders['X-Outlet-ID'] = String(outletContextId)

  try {
    const response = await apiClient.request({
      url: path,
      method: upperMethod,
      headers: requestHeaders,
      data: body,
    })
    return response.status === 204 ? {} : response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        if (error.response.status === 401) clearAccessToken()
        throw new ApiError(error.response.status, error.response.data || {})
      }
      throw new ApiError(0, { message: `Tidak dapat menghubungi API di ${API_ORIGIN}.` })
    }
    throw error
  }
}

export async function loginApi(credentials) {
  const result = await requestApi('/login', { method: 'POST', body: credentials })
  storeAccessToken(result.data?.token)
  return result
}

export async function registerApi(payload) {
  const result = await requestApi('/register', { method: 'POST', body: payload })
  storeAccessToken(result.data?.token)
  return result
}

function storeAccessToken(token) {
  if (!token) throw new ApiError(500, { message: 'Server tidak mengembalikan token akses.' })
  accessToken = token
  sessionStorage.setItem('laundrian_access_token', token)
}

function clearAccessToken() {
  accessToken = ''
  sessionStorage.removeItem('laundrian_access_token')
}

export function setOutletContext(id) {
  outletContextId = id || null
}

export async function loadCursorList(path, params = {}) {
  const items = []
  let cursor = ''
  do {
    const query = new URLSearchParams({ ...params, per_page: '100' })
    if (cursor) query.set('cursor', cursor)
    const result = await requestApi(`${path}?${query}`)
    items.push(...(Array.isArray(result.data) ? result.data : []))
    cursor = result.next_cursor || ''
  } while (cursor)
  return items
}

export async function logoutApi() {
  try { return await requestApi('/logout', { method: 'POST' }) }
  finally { clearAccessToken() }
}

export function apiOrigin() {
  return API_ORIGIN
}
