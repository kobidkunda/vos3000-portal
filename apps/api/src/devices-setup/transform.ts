import type { SipProvisioningDTO, SipTransport } from "@vos/shared";

export interface RawCreds {
  sipServer: string;
  port: number;
  transport: SipTransport;
  username: string;
  password: string;
  displayName?: string;
}

/**
 * Masked DTO transformer - never logs raw password
 * Synthetic example: sip:alice@sip.example.com:5060;transport=udp
 */
export function toMaskedDTO(raw: RawCreds, reveal: boolean): SipProvisioningDTO {
  const sipServer = raw.sipServer || "sip.example.com";
  const port = raw.port || 5060;
  const transport: SipTransport = (raw.transport as SipTransport) || "udp";
  const username = raw.username || "1001";
  const passwordMasked = reveal ? raw.password : raw.password ? `•••${raw.password.slice(-1)}` : "***";
  const displayName = raw.displayName;
  const sipUri = `sip:${username}@${sipServer}:${port};transport=${transport}`;
  // qrPayload must also be masked unless reveal
  const qrPayload = reveal ? sipUri : `sip:${username}@${sipServer}:${port};transport=${transport}`.replace(raw.password, "***");

  // cfg snippet for Yealink/Grandstream generic
  const cfgSnippet = `account.1.sip_server_host = ${sipServer}
account.1.sip_server_port = ${port}
account.1.transport = ${transport}
account.1.sip_user_id = ${username}
# password masked: ${passwordMasked}
account.1.display_name = ${displayName ?? username}`;

  return {
    sipServer,
    port,
    transport,
    username,
    passwordMasked,
    displayName,
    sipUri,
    qrPayload,
    cfgSnippet,
  };
}

/** Build raw creds from gateway record (synthetic fallback if missing) */
export function rawFromGateway(gw: Record<string, unknown> | undefined, fallbackUsername: string): RawCreds {
  const g = gw ?? {};
  return {
    sipServer: String(g.configured_ip ?? g.vos_gateway_id ?? "203.0.113.10"),
    port: Number(g.sip_port ?? 5060) || 5060,
    transport: "udp" as SipTransport,
    username: String(g.sip_username ?? fallbackUsername ?? "1001"),
    password: String(g.sip_password ?? g.vos_gateway_id ?? "VOS-SECRET-SYNTHETIC"),
    displayName: String(g.name ?? fallbackUsername),
  };
}
