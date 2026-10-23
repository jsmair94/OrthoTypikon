const CONTACT_API_PATH = "/api/contact";

function normalizeRuntimeDomain(candidate) {
  if (!candidate?.trim()) {
    throw new Error(
      "EXPO_PUBLIC_DOMAIN is required to build an Android release with a working contact form",
    );
  }

  const value = candidate.trim();
  let url;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new Error("EXPO_PUBLIC_DOMAIN must be a valid HTTPS URL or hostname");
  }

  const blockedHost =
    /(^localhost$|^127(?:\.|$)|^0\.0\.0\.0$|\.replit\.dev$)/i.test(
      url.hostname,
    );
  if (url.protocol !== "https:" || blockedHost) {
    throw new Error(
      "EXPO_PUBLIC_DOMAIN must be a reachable HTTPS domain, not localhost or a Replit development domain",
    );
  }

  return url.host;
}

function verifyContactApiBundle(bundle, apiHost) {
  if (!apiHost) {
    throw new Error("The Android bundle has no configured contact API host");
  }
  if (!bundle.includes(`https://${apiHost}`)) {
    throw new Error(
      `Android bundle does not contain the configured HTTPS API host https://${apiHost}`,
    );
  }
  if (!bundle.includes(CONTACT_API_PATH)) {
    throw new Error(
      `Android bundle does not contain the contact API path ${CONTACT_API_PATH}`,
    );
  }
}

module.exports = {
  CONTACT_API_PATH,
  normalizeRuntimeDomain,
  verifyContactApiBundle,
};
