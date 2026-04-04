import type { DocumentPickerAsset } from "expo-document-picker";
import type { CloudinarySignaturePayload, UploadedFilePayload } from "@/api/types";

type CloudinaryUploadResponse = {
  secure_url?: string;
  original_filename?: string;
};

function ensureBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

async function uploadWithUnsignedPreset(options: {
  asset: DocumentPickerAsset;
  cloudName: string;
  uploadPreset: string;
}) {
  const formData = new FormData();

  formData.append(
    "file",
    {
      uri: options.asset.uri,
      name: options.asset.name,
      type: options.asset.mimeType ?? "application/octet-stream",
    } as never,
  );
  formData.append("upload_preset", options.uploadPreset);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${options.cloudName}/raw/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const payload = (await uploadResponse.json()) as CloudinaryUploadResponse;

  if (!uploadResponse.ok || !payload.secure_url) {
    throw new Error("Document upload failed.");
  }

  return {
    secureUrl: payload.secure_url,
    originalFileName: payload.original_filename || options.asset.name,
  } satisfies UploadedFilePayload;
}

async function uploadWithSignedProxy(options: {
  asset: DocumentPickerAsset;
  webAppUrl: string;
}) {
  const baseUrl = ensureBaseUrl(options.webAppUrl);

  if (!baseUrl) {
    throw new Error("Add a valid Web App URL in Settings before uploading documents.");
  }

  const signResponse = await fetch(`${baseUrl}/api/cloudinary/sign`, {
    method: "POST",
  });

  if (!signResponse.ok) {
    throw new Error("Could not prepare document upload.");
  }

  const signature = (await signResponse.json()) as CloudinarySignaturePayload;
  const formData = new FormData();

  formData.append(
    "file",
    {
      uri: options.asset.uri,
      name: options.asset.name,
      type: options.asset.mimeType ?? "application/octet-stream",
    } as never,
  );
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  formData.append("overwrite", signature.overwrite);
  formData.append("unique_filename", signature.uniqueFilename);
  formData.append("use_filename", signature.useFilename);

  if (signature.uploadPreset) {
    formData.append("upload_preset", signature.uploadPreset);
  }

  const uploadResponse = await fetch(signature.uploadUrl, {
    method: "POST",
    body: formData,
  });

  const payload = (await uploadResponse.json()) as CloudinaryUploadResponse;

  if (!uploadResponse.ok || !payload.secure_url) {
    throw new Error("Document upload failed.");
  }

  return {
    secureUrl: payload.secure_url,
    originalFileName: payload.original_filename || options.asset.name,
  } satisfies UploadedFilePayload;
}

export async function uploadDocumentToCloudinary(options: {
  asset: DocumentPickerAsset;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  webAppUrl: string;
}) {
  const cloudName = options.cloudinaryCloudName?.trim();
  const uploadPreset = options.cloudinaryUploadPreset?.trim();

  if (cloudName && uploadPreset) {
    try {
      return await uploadWithUnsignedPreset({
        asset: options.asset,
        cloudName,
        uploadPreset,
      });
    } catch (error) {
      const baseUrl = ensureBaseUrl(options.webAppUrl);

      if (!baseUrl) {
        throw error;
      }
    }
  }

  return uploadWithSignedProxy({
    asset: options.asset,
    webAppUrl: options.webAppUrl,
  });
}
