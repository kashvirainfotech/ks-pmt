import { BadRequestException } from "@nestjs/common";

export function validateWebhookDestinationUrl(targetUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (err) {
    throw new BadRequestException("Invalid webhook destination URL format");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BadRequestException(
      "Webhook destination protocol must be HTTP or HTTPS",
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Block common loopback and internal hostname strings
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("127.") ||
    hostname === "::1" ||
    hostname === "ip6-localhost" ||
    hostname === "ip6-loopback"
  ) {
    throw new BadRequestException(
      "Destination URL points to a loopback address which is prohibited by outbound SSRF security policy",
    );
  }

  // 2. Block Cloud metadata service (AWS/GCP/Azure)
  if (
    hostname === "169.254.169.254" ||
    hostname.includes("metadata.google.internal") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".lan")
  ) {
    throw new BadRequestException(
      "Destination URL points to cloud metadata or internal network namespaces",
    );
  }

  // 3. Block Private IPv4 ranges (RFC 1918)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const octet1 = parseInt(match[1], 10);
    const octet2 = parseInt(match[2], 10);

    // 10.0.0.0/8
    if (octet1 === 10) {
      throw new BadRequestException(
        "Private network destination (10.0.0.0/8) is disallowed",
      );
    }
    // 172.16.0.0/12
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
      throw new BadRequestException(
        "Private network destination (172.16.0.0/12) is disallowed",
      );
    }
    // 192.168.0.0/16
    if (octet1 === 192 && octet2 === 168) {
      throw new BadRequestException(
        "Private network destination (192.168.0.0/16) is disallowed",
      );
    }
  }
}
