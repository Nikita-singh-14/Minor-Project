const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? ''

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}
