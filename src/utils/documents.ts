import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { AppConfig } from "@/providers/app-config-provider";

export function isCloudinaryAssetUrl(url?: string | null) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export function extractFileNameFromUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] ?? "");
  } catch {
    const parts = url.split("?")[0]?.split("/").filter(Boolean) ?? [];
    return parts[parts.length - 1] ?? null;
  }
}

function extractExtension(value?: string | null) {
  if (!value) {
    return null;
  }

  const lastDot = value.lastIndexOf(".");
  if (lastDot < 0 || lastDot === value.length - 1) {
    return null;
  }

  return value.slice(lastDot + 1).toLowerCase();
}

export function resolveDocumentFileName(options: {
  title?: string | null;
  attachment?: string | null;
  fallback?: string;
}) {
  const title = options.title?.trim();
  const attachmentName = extractFileNameFromUrl(options.attachment);
  const extension = extractExtension(attachmentName);

  if (title) {
    return extractExtension(title) ? title : extension ? `${title}.${extension}` : title;
  }

  return attachmentName || options.fallback || "document.pdf";
}

export function buildCloudinaryProxyUrl(
  config: AppConfig,
  attachmentUrl: string,
  fileName: string,
  options?: { download?: boolean },
) {
  const baseUrl = config.webAppUrl.trim().replace(/\/$/, "");

  if (!baseUrl) {
    return attachmentUrl;
  }

  const searchParams = new URLSearchParams({
    url: attachmentUrl,
    name: fileName,
  });

  if (options?.download) {
    searchParams.set("download", "1");
  }

  return `${baseUrl}/api/cloudinary/file?${searchParams.toString()}`;
}

export async function openDocumentPreview(
  config: AppConfig,
  attachmentUrl: string,
  fileName: string,
) {
  const targetUrl =
    isCloudinaryAssetUrl(attachmentUrl) && config.webAppUrl.trim()
      ? buildCloudinaryProxyUrl(config, attachmentUrl, fileName)
      : attachmentUrl;

  await WebBrowser.openBrowserAsync(targetUrl, {
    showTitle: true,
    enableBarCollapsing: true,
  });
}

export async function downloadDocument(
  config: AppConfig,
  attachmentUrl: string,
  fileName: string,
) {
  const targetUrl =
    isCloudinaryAssetUrl(attachmentUrl) && config.webAppUrl.trim()
      ? buildCloudinaryProxyUrl(config, attachmentUrl, fileName, {
          download: true,
        })
      : attachmentUrl;

  await Linking.openURL(targetUrl);
}
