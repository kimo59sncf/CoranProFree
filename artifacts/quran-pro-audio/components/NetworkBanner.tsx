import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Bandeau réseau global, discret, affiché au-dessus de l'interface.
 * - Hors connexion : bandeau persistant.
 * - Retour de connexion : message bref puis disparition automatique.
 */
export function NetworkBanner() {
  const status = useNetworkStatus();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [showOnline, setShowOnline] = useState(false);
  const prevRef = useRef(status);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = status;
    if (status === 'online' && prev === 'offline') {
      setShowOnline(true);
      const timer = setTimeout(() => setShowOnline(false), 2600);
      return () => clearTimeout(timer);
    }
    if (status !== 'offline') setShowOnline(false);
  }, [status]);

  if (status === 'offline') {
    return (
      <Text style={[styles.banner, { backgroundColor: colors.destructive, color: '#FFFFFF', paddingTop: insets.top + 6 }]}>
        {t('network.offline')}
      </Text>
    );
  }

  if (showOnline) {
    return (
      <Text style={[styles.banner, { backgroundColor: colors.primary, color: colors.primaryForeground, paddingTop: insets.top + 6 }]}>
        {t('network.online')}
      </Text>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    textAlign: 'center',
    paddingBottom: 8,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
  },
});
