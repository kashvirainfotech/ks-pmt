import * as crypto from "crypto";

export function generateWebhookSecret(): string {
  const bytes = crypto.randomBytes(32).toString("hex");
  return `whsec_${bytes}`;
}

export function computeWebhookSignature(
  secret: string,
  timestamp: string | number,
  payload: any,
): string {
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const signaturePayload = `${timestamp}.${payloadString}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(signaturePayload);
  return `t=${timestamp},v1=${hmac.digest("hex")}`;
}
