export const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL || 'https://your-backend.railway.app'
    : 'http://localhost:8000'

export const WS_URL = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_WS_URL || 'wss://your-backend.railway.app/ws'
    : 'ws://localhost:8000/ws'