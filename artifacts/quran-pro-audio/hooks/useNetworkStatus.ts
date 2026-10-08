import { useNetworkState } from 'expo-network';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

/**
 * État réseau centralisé (web + Android + iOS).
 * Basé sur expo-network, dont `useNetworkState()` est compatible avec le web.
 */
export function useNetworkStatus(): NetworkStatus {
  const state = useNetworkState();
  if (state.isConnected === true) return 'online';
  if (state.isConnected === false) return 'offline';
  return 'unknown';
}
