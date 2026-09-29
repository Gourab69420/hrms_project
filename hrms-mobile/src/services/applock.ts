/** Optional biometric/PIN app lock (per-device, opt-in from Profile). */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const FLAG = 'hrms_app_lock';

export async function lockEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(FLAG)) === '1';
  } catch {
    return false;
  }
}

export async function setLockEnabled(v: boolean) {
  try {
    await SecureStore.setItemAsync(FLAG, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export async function supported(): Promise<boolean> {
  try {
    return await LocalAuthentication.hasHardwareAsync();
  } catch {
    return false;
  }
}

export async function unlock(reason = 'Unlock HRMS'): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use passcode',
    });
    return res.success;
  } catch {
    return false;
  }
}
