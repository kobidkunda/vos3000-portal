# Realtime UI
Backend owns VOS polling/event collection and broadcasts normalized state. Client subscribes via WebSocket/SSE. Coalesce high-frequency updates, show stale threshold, and fall back to bounded read refresh if the stream fails.
