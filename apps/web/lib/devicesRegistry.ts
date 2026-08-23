import type { DeviceKey, DeviceCategory } from "@vos/shared";

export interface DeviceDefinition {
  key: DeviceKey;
  label: string;
  category: DeviceCategory;
  icon: string;
  effortMinutes: number;
  capabilities: { qr: boolean; cfg: boolean; webrtc: boolean };
  fieldMapping: { sipServer: string; port: string; transport: string; username: string; password: string };
  troubleshooting: string[];
  prerequisites?: string[];
  instructionSteps: { title: string; body: string; snippet?: string }[];
}

export const DEVICES: DeviceDefinition[] = [
  {
    key: "microsip",
    label: "MicroSIP",
    category: "softphone",
    icon: "phone",
    effortMinutes: 1,
    capabilities: { qr: true, cfg: false, webrtc: false },
    fieldMapping: { sipServer: "SIP Server", port: "Port", transport: "Transport", username: "Username", password: "Password" },
    troubleshooting: ["Check SIP server and port 5060 open", "Verify username/password", "Disable SIP ALG on router"],
    prerequisites: ["Windows 10+ or macOS 12+", "MicroSIP 3.21+"],
    instructionSteps: [
      { title: "Open MicroSIP → Right-click tray → Add Account", body: "In the system tray, right-click MicroSIP and choose Add Account.", snippet: "MicroSIP → Add Account" },
      { title: "Enter SIP credentials", body: "Fill SIP Server, Username and Password from the table below. Set Domain to SIP Server.", snippet: "sip.example.com:5060;transport=udp" },
      { title: "Save and register", body: "Click Save. MicroSIP will register and show Online (green dot).", snippet: "Status: Online" },
      { title: "Make a test call", body: "Dial *97 or your test number. Verify in Test & Verify step.", snippet: "*97" },
    ],
  },
  {
    key: "linphone",
    label: "Linphone",
    category: "softphone",
    icon: "phone",
    effortMinutes: 1,
    capabilities: { qr: true, cfg: false, webrtc: false },
    fieldMapping: { sipServer: "Domain", port: "Port", transport: "Transport", username: "Username", password: "Password" },
    troubleshooting: ["Use Linphone Assistant → Use SIP Account", "Ensure STUN disabled if not behind NAT"],
    prerequisites: ["Linphone 5.x desktop or mobile"],
    instructionSteps: [
      { title: "Linphone Assistant → Use SIP Account", body: "Open Linphone, go to Assistant and select Use SIP Account.", snippet: "Assistant → Use SIP Account" },
      { title: "Enter account details", body: "Enter Username, Password, Domain (SIP Server), and set Transport to UDP.", snippet: "Username / Password / Domain" },
      { title: "Verify registration", body: "Linphone shows registered with green check.", snippet: "Registration: OK" },
    ],
  },
  {
    key: "zoiper",
    label: "Zoiper 5",
    category: "softphone",
    icon: "phone",
    effortMinutes: 1,
    capabilities: { qr: true, cfg: false, webrtc: false },
    fieldMapping: { sipServer: "Hostname", port: "Port", transport: "Transport", username: "Username", password: "Password" },
    troubleshooting: ["Zoiper → Settings → Accounts → Add", "Scan QR from this wizard (Pro feature if available)"],
    prerequisites: ["Zoiper 5 Free/Pro"],
    instructionSteps: [
      { title: "Settings → Accounts → Add", body: "In Zoiper, open Settings → Accounts and tap Add account.", snippet: "Settings → Accounts" },
      { title: "Choose SIP", body: "Select SIP and enter Server Host, Username, Password.", snippet: "sip: user@domain" },
      { title: "Register", body: "Save. Account shows Registered.", snippet: "Registered" },
    ],
  },
  {
    key: "groundwire",
    label: "Groundwire",
    category: "softphone",
    icon: "phone",
    effortMinutes: 2,
    capabilities: { qr: true, cfg: false, webrtc: false },
    fieldMapping: { sipServer: "Domain", port: "Port", transport: "Transport", username: "Username", password: "Password" },
    troubleshooting: ["Check push notification settings if calls drop in background", "If registration fails with 401, re-copy the password — Groundwire autofill can truncate special characters"],
    prerequisites: ["iOS / Android - Acrobits Groundwire"],
    instructionSteps: [
      { title: "Add SIP Account", body: "Tap + → SIP Account and fill Domain, Username, Password.", snippet: "Groundwire → + → SIP" },
      { title: "Advanced: Transport", body: "Set Transport to UDP and verify port 5060.", snippet: "Transport: UDP" },
      { title: "Verify", body: "Account shows green Registered.", snippet: "Registered" },
    ],
  },
  {
    key: "bria",
    label: "Bria Solo / Teams",
    category: "softphone",
    icon: "phone",
    effortMinutes: 2,
    capabilities: { qr: true, cfg: false, webrtc: false },
    fieldMapping: { sipServer: "Domain", port: "Port", transport: "Transport", username: "Authorization Name", password: "Password" },
    troubleshooting: ["Ensure SIP credentials are not expired", "Check firewall for 5060/5061"],
    prerequisites: ["Bria Solo 6+"],
    instructionSteps: [
      { title: "Accounts → + → SIP", body: "In Bria, tap Accounts → + and choose SIP.", snippet: "Accounts → SIP" },
      { title: "Enter SIP details", body: "Enter User Details with Username and Domain.", snippet: "Username@Domain" },
      { title: "Register", body: "Save. Status becomes Registered.", snippet: "Registered" },
    ],
  },
  {
    key: "yealink-t5x",
    label: "Yealink T5 Series",
    category: "deskphone",
    icon: "devices",
    effortMinutes: 2,
    capabilities: { qr: true, cfg: true, webrtc: false },
    fieldMapping: { sipServer: "SIP Server Host", port: "Server Port", transport: "Transport", username: "Register Name", password: "Password" },
    troubleshooting: ["Web UI at phone IP → Account → Register", "Ensure firmware ≥ 28.83.0.50", "Disable SIP ALG"],
    prerequisites: ["Firmware 28.83.0.50+", "Web access to phone IP"],
    instructionSteps: [
      { title: "Open Web UI → Account → Register", body: "Enter phone IP in browser, login admin/admin, go to Account → Register.", snippet: "Account → Register" },
      { title: "Enter SIP fields", body: "Set Line Active = Enabled, Label/Display Name, Register Name = Username, Password, SIP Server = SIP Server, Port = 5060, Transport = UDP.", snippet: "sip_server_host = sip.example.com" },
      { title: "Confirm and save", body: "Click Confirm. Phone registers and line key lights green.", snippet: "Registered" },
      { title: "Provision via .cfg (optional)", body: "Download .cfg below and upload via Settings → Configuration → Import.", snippet: "voip.cfg" },
      { title: "Test call", body: "Dial test number and verify in portal Test & Verify.", snippet: "Test Call" },
    ],
  },
  {
    key: "grandstream",
    label: "Grandstream GXP / GRP",
    category: "deskphone",
    icon: "devices",
    effortMinutes: 2,
    capabilities: { qr: true, cfg: true, webrtc: false },
    fieldMapping: { sipServer: "SIP Server", port: "SIP Port", transport: "Transport", username: "SIP User ID", password: "SIP Password" },
    troubleshooting: ["Advanced → SIP → Transport = UDP", "Check NAT Traversal = No if public IP"],
    prerequisites: ["GXP2170/GRP261x firmware 1.0.7+"],
    instructionSteps: [
      { title: "Web UI → Accounts → SIP Account", body: "Browse to phone IP, login, open Accounts → Account 1 → General Settings.", snippet: "Accounts → SIP" },
      { title: "Fill SIP Account", body: "Enter SIP Server, SIP User ID, SIP Password, set Transport UDP.", snippet: "SIP Server: sip.example.com" },
      { title: "Save and Apply", body: "Click Save and Apply. Status shows Registered Yes.", snippet: "Registered: Yes" },
      { title: "Optional .cfg", body: "Download .cfg and import via Maintenance → Upgrade.", snippet: "cfg.xml" },
    ],
  },
  {
    key: "cisco-78xx",
    label: "Cisco 78xx",
    category: "deskphone",
    icon: "devices",
    effortMinutes: 3,
    capabilities: { qr: false, cfg: true, webrtc: false },
    fieldMapping: { sipServer: "Proxy", port: "Port", transport: "Transport", username: "User ID", password: "Password" },
    troubleshooting: ["Ensure CUCM/SIP firmware, not MPP vs SIP confusion", "Check VLAN and LLDP"],
    prerequisites: ["SIP firmware, not SCCP"],
    instructionSteps: [
      { title: "Phone Web UI → Voice → SIP", body: "Access phone web at IP → Voice tab → SIP.", snippet: "Voice → SIP" },
      { title: "Enter Proxy and User ID", body: "Set Proxy = SIP Server, User ID = Username, Password, Display Name.", snippet: "Proxy: sip.example.com" },
      { title: "Apply", body: "Submit All Changes. Phone reboots and registers.", snippet: "Registered" },
    ],
  },
  {
    key: "poly-vvx",
    label: "Poly VVX / Edge",
    category: "deskphone",
    icon: "devices",
    effortMinutes: 2,
    capabilities: { qr: true, cfg: true, webrtc: false },
    fieldMapping: { sipServer: "Server Address", port: "Server Port", transport: "Transport", username: "Authentication User ID", password: "Authentication Password" },
    troubleshooting: ["Web UI → Simple Setup → SIP", "Check outbound proxy if behind SBC"],
    prerequisites: ["UC Software 6.4+"],
    instructionSteps: [
      { title: "Web UI → Simple Setup", body: "Browse to phone IP → Simple Setup → SIP Server.", snippet: "Simple Setup → SIP" },
      { title: "Enter Server and Auth ID", body: "Address = SIP Server, Port, Transport UDP, User ID = Username.", snippet: "Server Address" },
      { title: "Save", body: "Save. Line shows Registered.", snippet: "Line: Registered" },
    ],
  },
  {
    key: "fanvil",
    label: "Fanvil X / U Series",
    category: "deskphone",
    icon: "devices",
    effortMinutes: 2,
    capabilities: { qr: true, cfg: true, webrtc: false },
    fieldMapping: { sipServer: "SIP Server", port: "Port", transport: "Transport", username: "Username", password: "Password" },
    troubleshooting: ["Line → SIP → Transport UDP", "Check SIP ALG disabled"],
    prerequisites: ["Fanvil X3U/X4U/X5U firmware 2.x"],
    instructionSteps: [
      { title: "Web UI → Line → SIP", body: "Login to phone IP → Line → SIP.", snippet: "Line → SIP" },
      { title: "Fill SIP info", body: "SIP Server, Username, Password, Transport UDP.", snippet: "SIP Server" },
      { title: "Apply", body: "Apply. Status shows Registered.", snippet: "Registered" },
    ],
  },
  {
    key: "webrtc",
    label: "WebRTC Dialer (Browser)",
    category: "webrtc",
    icon: "monitor",
    effortMinutes: 0,
    capabilities: { qr: false, cfg: false, webrtc: true },
    fieldMapping: { sipServer: "WSS URL", port: "WSS Port", transport: "WSS", username: "Username", password: "Password" },
    troubleshooting: ["Allow microphone permission", "Use HTTPS (WSS requires TLS)", "Check STUN stun.l.google.com:19302"],
    prerequisites: ["Chrome/Edge 110+, HTTPS, Mic permission"],
    instructionSteps: [
      { title: "Launch Web Dialer", body: "Click Launch Web Dialer in Test & Verify. Token provisioned automatically.", snippet: "Launch Web Dialer" },
      { title: "Allow mic", body: "Browser prompts Allow microphone → Allow.", snippet: "Allow microphone" },
      { title: "Dial", body: "Enter number and press Call. Latency shown in portal.", snippet: "Call" },
    ],
  },
  {
    key: "mobile-dialer",
    label: "Mobile Dialer",
    category: "mobile",
    icon: "smartphone",
    effortMinutes: 1,
    capabilities: { qr: true, cfg: false, webrtc: false },
    fieldMapping: { sipServer: "SIP Server", port: "Port", transport: "Transport", username: "Username", password: "Password" },
    troubleshooting: ["iOS: allow background audio for incoming", "Android: disable battery optimization for dialer"],
    prerequisites: ["iOS 16+ / Android 12+"],
    instructionSteps: [
      { title: "Install dialer", body: "Install Linphone or Zoiper mobile from App Store/Play Store.", snippet: "Linphone / Zoiper" },
      { title: "QR provision", body: "In wizard, tap QR and scan with phone camera.", snippet: "Scan QR" },
      { title: "Verify", body: "App shows Registered. Test call in portal.", snippet: "Registered" },
    ],
  },
];

const DEVICE_MAP: Record<string, DeviceDefinition> = Object.fromEntries(DEVICES.map((d) => [d.key, d]));

export function getDevice(key: string): DeviceDefinition | undefined {
  return DEVICE_MAP[key];
}

export function filterDevices(category?: DeviceCategory, search?: string): DeviceDefinition[] {
  let out = DEVICES;
  if (category) out = out.filter((d) => d.category === category);
  if (search) {
    const q = search.toLowerCase();
    out = out.filter((d) => d.label.toLowerCase().includes(q) || d.key.toLowerCase().includes(q));
  }
  return out;
}
