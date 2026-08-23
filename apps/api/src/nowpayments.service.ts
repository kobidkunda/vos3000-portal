import { Injectable, Inject, forwardRef } from "@nestjs/common";
import crypto from "node:crypto";
import { DataSourcesService } from "./data-sources.service.js";

export interface NowpaymentsConfig {
  apiKey: string;
  ipnSecret: string;
  sandbox: boolean;
  publicWebhookUrl?: string;
}

export interface CreateInvoiceParams {
  priceAmount: number;
  priceCurrency: string;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

@Injectable()
export class NowpaymentsService {
  constructor(
    @Inject(forwardRef(() => DataSourcesService))
    private sources: DataSourcesService
  ) {}

  /**
   * Resolve current NOWPayments configuration from PostgreSQL portal_resources (db-first),
   * falling back to environment variables.
   */
  async getConfig(): Promise<NowpaymentsConfig> {
    let dbConfig: any = null;
    try {
      if (this.sources.pg) {
        const res = await this.sources.pg.query(
          `SELECT resource_data FROM portal_resources 
           WHERE resource_type = 'payment_provider_settings' AND resource_key = 'nowpayments' AND organization_id IS NULL 
           LIMIT 1`
        );
        if (res.rowCount && res.rows[0].resource_data) {
          dbConfig = res.rows[0].resource_data;
        }
      }
    } catch {
      // Fall back to environment
    }

    const apiKey = dbConfig?.apiKey || process.env.NOWPAYMENTS_API_KEY || "";
    const ipnSecret = dbConfig?.ipnSecret || process.env.NOWPAYMENTS_IPN_SECRET || "";
    const sandbox = dbConfig?.sandbox !== undefined
      ? Boolean(dbConfig.sandbox)
      : process.env.NOWPAYMENTS_SANDBOX === "true" || !process.env.NOWPAYMENTS_API_KEY;
    const publicWebhookUrl = dbConfig?.publicWebhookUrl || process.env.NOWPAYMENTS_PUBLIC_WEBHOOK_URL || "";

    return {
      apiKey: String(apiKey).trim(),
      ipnSecret: String(ipnSecret).trim(),
      sandbox,
      publicWebhookUrl: String(publicWebhookUrl).trim(),
    };
  }

  /**
   * Save NOWPayments configuration in DB
   */
  async saveConfig(config: Partial<NowpaymentsConfig>): Promise<NowpaymentsConfig> {
    const current = await this.getConfig();
    const merged: NowpaymentsConfig = {
      apiKey: config.apiKey !== undefined ? String(config.apiKey).trim() : current.apiKey,
      ipnSecret: config.ipnSecret !== undefined ? String(config.ipnSecret).trim() : current.ipnSecret,
      sandbox: config.sandbox !== undefined ? Boolean(config.sandbox) : current.sandbox,
      publicWebhookUrl: config.publicWebhookUrl !== undefined ? String(config.publicWebhookUrl).trim() : current.publicWebhookUrl,
    };

    if (this.sources.pg) {
      await this.sources.pg.query(
        `INSERT INTO portal_resources (organization_id, resource_type, resource_key, resource_data, updated_at)
         VALUES (NULL, 'payment_provider_settings', 'nowpayments', $1::jsonb, now())
         ON CONFLICT (organization_id, resource_type, resource_key)
         DO UPDATE SET resource_data = EXCLUDED.resource_data, updated_at = now()`,
        [JSON.stringify(merged)]
      );
    }

    return merged;
  }

  getBaseUrl(sandbox: boolean): string {
    return sandbox
      ? "https://api-sandbox.nowpayments.io/v1"
      : "https://api.nowpayments.io/v1";
  }

  /**
   * Test API connectivity with NOWPayments
   */
  async testConnection(customApiKey?: string, customSandbox?: boolean): Promise<{ ok: boolean; message: string; details?: any }> {
    const config = await this.getConfig();
    const apiKey = customApiKey !== undefined ? customApiKey : config.apiKey;
    const sandbox = customSandbox !== undefined ? customSandbox : config.sandbox;

    if (!apiKey) {
      return {
        ok: false,
        message: "NOWPayments API Key is not configured. Please enter an API key or set NOWPAYMENTS_API_KEY in .env.",
      };
    }

    const baseUrl = this.getBaseUrl(sandbox);
    try {
      const res = await fetch(`${baseUrl}/status`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          message: data?.message || `NOWPayments API returned HTTP ${res.status}`,
          details: data,
        };
      }

      return {
        ok: true,
        message: `Connection successful (${sandbox ? "Sandbox Mode" : "Production Mode"}). Service status: ${data?.message || "OK"}`,
        details: data,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: `Failed to connect to NOWPayments API: ${err?.message || "Network error"}`,
      };
    }
  }

  /**
   * Get list of supported currencies
   */
  async getCurrencies(): Promise<string[]> {
    const config = await this.getConfig();
    if (!config.apiKey) {
      return ["btc", "eth", "usdttrc20", "usdterc20", "ltc", "trx", "sol", "doge", "bch"];
    }

    try {
      const baseUrl = this.getBaseUrl(config.sandbox);
      const res = await fetch(`${baseUrl}/currencies`, {
        method: "GET",
        headers: {
          "x-api-key": config.apiKey,
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      return Array.isArray(data?.currencies) ? data.currencies : [];
    } catch {
      return ["btc", "eth", "usdttrc20", "usdterc20", "ltc", "trx", "sol", "doge", "bch"];
    }
  }

  /**
   * Create an invoice via NOWPayments API
   */
  async createInvoice(params: CreateInvoiceParams): Promise<{
    id: string;
    invoice_url: string;
    order_id: string;
    price_amount: string | number;
    price_currency: string;
    raw?: any;
  }> {
    const config = await this.getConfig();
    if (!config.apiKey) {
      // In sandbox/demo fallback if no key is provided
      const mockId = `mock_np_${crypto.randomUUID().slice(0, 8)}`;
      return {
        id: mockId,
        invoice_url: `https://nowpayments.io/payment/?iid=${mockId}`,
        order_id: params.orderId,
        price_amount: params.priceAmount,
        price_currency: params.priceCurrency,
        raw: { mock: true, note: "NOWPayments API Key is not set; demo invoice generated." },
      };
    }

    const baseUrl = this.getBaseUrl(config.sandbox);
    const body: any = {
      price_amount: params.priceAmount,
      price_currency: params.priceCurrency.toLowerCase(),
      order_id: params.orderId,
      order_description: params.orderDescription || `Didflow Wallet Deposit ${params.orderId}`,
    };

    if (params.ipnCallbackUrl) {
      body.ipn_callback_url = params.ipnCallbackUrl;
    }
    if (params.successUrl) {
      body.success_url = params.successUrl;
    }
    if (params.cancelUrl) {
      body.cancel_url = params.cancelUrl;
    }

    const res = await fetch(`${baseUrl}/invoice`, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || `NOWPayments API create invoice error: HTTP ${res.status}`);
    }

    return {
      id: String(data.id || data.invoice_id || ""),
      invoice_url: String(data.invoice_url || ""),
      order_id: String(data.order_id || params.orderId),
      price_amount: data.price_amount || params.priceAmount,
      price_currency: data.price_currency || params.priceCurrency,
      raw: data,
    };
  }

  /**
   * Verify NOWPayments Instant Payment Notification (IPN) Signature (HMAC-SHA512)
   */
  verifyIpnSignature(rawBody: any, signature: string | undefined, ipnSecret?: string): boolean {
    if (!ipnSecret) return true; // If no IPN secret is configured in dev, skip or log
    if (!signature) return false;

    try {
      const sortedObject = (obj: any): any => {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
        return Object.keys(obj)
          .sort()
          .reduce((result: any, key: string) => {
            result[key] = sortedObject(obj[key]);
            return result;
          }, {});
      };

      const sortedBody = sortedObject(rawBody);
      const jsonString = JSON.stringify(sortedBody);

      const hmac = crypto.createHmac("sha512", ipnSecret);
      hmac.update(jsonString);
      const calculatedSig = hmac.digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(calculatedSig, "utf8"),
        Buffer.from(signature.trim().toLowerCase(), "utf8")
      );
    } catch {
      return false;
    }
  }
}
