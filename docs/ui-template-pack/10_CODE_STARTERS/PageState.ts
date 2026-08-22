export type PageState =
  | "initial"
  | "loading"
  | "success"
  | "empty"
  | "error"
  | "forbidden"
  | "not_found"
  | "degraded"
  | "stale";

export type RealtimeState =
  | "connecting"
  | "live"
  | "reconnecting"
  | "stale"
  | "disconnected";
