import { z } from "zod";

/**
 * DeviceSetup - shared DTOs and Zod validators
 * Synthetic example date: 2026-08-23T12:00:00.000Z
 * No secrets in logs - password is always masked in DTOs
 */

export type DeviceKey =
  | "microsip"
  | "linphone"
  | "zoiper"
  | "groundwire"
  | "bria"
  | "yealink-t5x"
  | "grandstream"
  | "cisco-78xx"
  | "poly-vvx"
  | "fanvil"
  | "webrtc"
  | "mobile-dialer";

export type DeviceCategory = "softphone" | "deskphone" | "mobile" | "webrtc";

export type SipTransport = "udp" | "tcp" | "tls";

export interface SipProvisioningDTO {
  /** SIP server host (mono 13px in UI) */
  sipServer: string;
  /** SIP port - right-aligned tabular-nums */
  port: number;
  /** Transport pill */
  transport: SipTransport;
  /** SIP username / account - mono */
  username: string;
  /** Masked password: "***" or "•••8" hint; never raw */
  passwordMasked: string;
  /** Optional display name */
  displayName?: string;
  /** Full SIP URI: sip:user@domain:port;transport=udp */
  sipUri: string;
  /** QR payload (masked unless revealed) */
  qrPayload?: string;
  /** Yealink/Grandstream generic cfg snippet */
  cfgSnippet?: string;
}

export interface DeviceInstructionStepDTO {
  order: number;
  title: string;
  body: string;
  snippet?: string;
}

export interface DeviceInstructionDTO {
  deviceKey: DeviceKey;
  label: string;
  category: DeviceCategory;
  steps: DeviceInstructionStepDTO[];
  troubleshooting: string[];
}

export interface VerifyRequestDTO {
  gatewayId: string;
  phoneId?: string;
  deviceKey: DeviceKey;
}

export interface VerifyResponseDTO {
  registered: boolean;
  ip?: string;
  lastSeenIso: string;
  latencyMs?: number;
  degraded?: boolean;
}

export interface CopyEventDTO {
  gatewayId: string;
  deviceKey: DeviceKey;
  field: "sipServer" | "port" | "transport" | "username" | "displayName" | "sipUri" | "qrPayload";
}

// Zod schemas - validate query/body - no `any`

export const DeviceKeySchema = z.enum([
  "microsip",
  "linphone",
  "zoiper",
  "groundwire",
  "bria",
  "yealink-t5x",
  "grandstream",
  "cisco-78xx",
  "poly-vvx",
  "fanvil",
  "webrtc",
  "mobile-dialer",
]);

export const DeviceCategorySchema = z.enum(["softphone", "deskphone", "mobile", "webrtc"]);

export const SipTransportSchema = z.enum(["udp", "tcp", "tls"]);

export const GatewayIdSchema = z.string().uuid({ message: "gatewayId must be UUID" });

export const PhoneIdSchema = z.string().uuid({ message: "phoneId must be UUID" }).optional();

export const InstructionsQuerySchema = z.object({
  deviceKey: DeviceKeySchema,
  gatewayId: GatewayIdSchema,
  phoneId: PhoneIdSchema,
  reveal: z
    .union([z.literal("0"), z.literal("1"), z.boolean()])
    .optional()
    .transform((v) => v === "1" || v === true),
});

export const VerifyBodySchema = z.object({
  gatewayId: GatewayIdSchema,
  phoneId: PhoneIdSchema,
  deviceKey: DeviceKeySchema,
});

export const CopyEventBodySchema = z.object({
  gatewayId: GatewayIdSchema,
  deviceKey: DeviceKeySchema,
  field: z.enum(["sipServer", "port", "transport", "username", "displayName", "sipUri", "qrPayload"]),
});

export const DevicesListQuerySchema = z.object({
  category: DeviceCategorySchema.optional(),
  search: z.string().max(100).optional(),
});
