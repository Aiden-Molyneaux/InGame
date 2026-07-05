import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// F14 — the access + refresh tokens live in the device SECURE ENCLAVE / keystore (expo-secure-store),
// NEVER in redux-persist (decision 0051/F14; product-spec §9). On web (the Chrome dev loop only)
// SecureStore is unavailable, so we fall back to an in-memory map — web is not a shipped surface.

const ACCESS_KEY = 'ingame_access_token';
const REFRESH_KEY = 'ingame_refresh_token';
const isWeb = Platform.OS === 'web';
const mem = new Map<string, string>();

async function put(key: string, value: string): Promise<void> {
  if (isWeb) {
    mem.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}
async function get(key: string): Promise<string | null> {
  if (isWeb) return mem.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}
async function del(key: string): Promise<void> {
  if (isWeb) {
    mem.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([put(ACCESS_KEY, tokens.accessToken), put(REFRESH_KEY, tokens.refreshToken)]);
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([get(ACCESS_KEY), get(REFRESH_KEY)]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([del(ACCESS_KEY), del(REFRESH_KEY)]);
}
