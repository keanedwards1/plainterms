export function getApiBaseUrl(): string {
  const value = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!value) {
    throw new Error(
      "Missing API_BASE_URL (or NEXT_PUBLIC_API_BASE_URL) environment variable."
    );
  }

  return value.replace(/\/+$/, "");
}
