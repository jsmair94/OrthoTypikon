import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPrayerSession, setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';

const INSTALLATION_KEY = '@orthotypikon/prayer-community-installation';
const TOKEN_KEY = '@orthotypikon/prayer-community-token';
const TOKEN_EXPIRY_KEY = '@orthotypikon/prayer-community-token-expiry';

export function configurePrayerCommunityApi() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  setBaseUrl(domain ? `https://${domain}` : null);
  setAuthTokenGetter(() => AsyncStorage.getItem(TOKEN_KEY));
}

function createInstallationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export async function ensurePrayerCommunitySession() {
  const [savedToken, expiry] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(TOKEN_EXPIRY_KEY),
  ]);
  if (savedToken && expiry && new Date(expiry).getTime() > Date.now() + 86400000) return savedToken;

  let installationId = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (!installationId) {
    installationId = createInstallationId();
    await AsyncStorage.setItem(INSTALLATION_KEY, installationId);
  }
  const session = await createPrayerSession({ installationId });
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, session.token),
    AsyncStorage.setItem(TOKEN_EXPIRY_KEY, session.expiresAt),
  ]);
  return session.token;
}