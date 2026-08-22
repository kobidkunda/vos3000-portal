export const money = (v:number|string, currency="USD") => new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:4}).format(Number(v));
export const number = (v:number|string) => new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(Number(v));
export const pct = (v:number|string) => `${Number(v).toFixed(2)}%`;
export const isoNow = () => new Date().toISOString();
export { parseTelecomPhone, getCountryName, normalizeTelecomString } from "./phone.js";
