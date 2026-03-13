import { useEffect, useRef, useCallback } from 'react'

export function useWebSocket(workspaceId, token, onMessage) {
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  const connect = useCallback(() => {
    if (!workspaceId || !token) return

    const url = `ws://localhost:4000/ws?token=${token}&workspaceId=${workspaceId}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        onMessage(msg)
      } catch {}
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected — reconnecting in 3s...')
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [workspaceId, token, onMessage])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { send }
}
