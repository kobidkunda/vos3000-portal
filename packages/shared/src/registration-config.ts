export interface RegistrationSettings {
  default_rate_group_id: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface RegistrationSettingsPutBody {
  default_rate_group_id: string | null;
}

export interface SelfRegistrationBody {
  email:string;
  password:string;
  organizationName:string;
  phone:string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SUPPORT_TICKET_CATEGORIES=[
  "Routing & Gateways","Billing & Finance","Rate & Commercial","Custom Plan Request","Technical / API","Emergency Dispatch"
] as const;

export function validateRegistrationSettingsPutBody(value: unknown): Array<{field:string;message:string;code:string}> {
  const id = (value as RegistrationSettingsPutBody | null | undefined)?.default_rate_group_id;
  if (id === null || id === undefined || id === "") return [];
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return [{ field: "default_rate_group_id", message: "Default rate group must be a valid UUID or null", code: "UUID" }];
  }
  return [];
}
