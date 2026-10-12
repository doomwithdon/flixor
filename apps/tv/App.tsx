import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { plexCode, plexPoll, traktCode, traktPoll } from './src/deviceAuth';

type Service = 'plex' | 'trakt';
export default function App() {
  const [service, setService] = useState<Service | null>(null);
  const [pair, setPair] = useState<{ code: string; url: string } | null>(null);
  const [message, setMessage] = useState('');
  const [connected, setConnected] = useState<Record<Service, boolean>>({ plex: false, trakt: false });
  useEffect(() => { Promise.all(['plex', 'trakt'].map(async s => [s, !!(await AsyncStorage.getItem('flixor-tv:' + s + ':token'))] as const)).then(items => setConnected(Object.fromEntries(items) as Record<Service, boolean>)); }, []);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (service) { setService(null); return true; } return false; });
    return () => listener.remove();
  }, [service]);
  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setPair(null); setMessage('Requesting pairing code…');
    (async () => {
      try {
        const info = service === 'plex' ? await plexCode() : await traktCode();
        if (cancelled) return;
        setPair({ code: info.code, url: info.url });
        setMessage('Open the address on your phone and enter this code.');
        const started = Date.now();
        const poll = async () => {
          if (cancelled) return;
          if (Date.now() - started > (service === 'plex' ? 300000 : ('expiresIn' in info ? info.expiresIn * 1000 : 600000))) { setMessage('Code expired. Go back and try again.'); return; }
          try {
            const token = service === 'plex' ? await plexPoll((info as Awaited<ReturnType<typeof plexCode>>).id) : await traktPoll((info as Awaited<ReturnType<typeof traktCode>>).deviceCode);
            if (cancelled) return;
            if (token) {
              await AsyncStorage.setItem('flixor-tv:' + service + ':token', token);
              setConnected(c => ({ ...c, [service]: true }));
              setMessage('Connected successfully!');
              return;
            }
          } catch (e) { if (!cancelled) setMessage(e instanceof Error ? e.message : 'Pairing error'); }
          timeout = setTimeout(poll, service === 'plex' ? 3000 : Math.max(5000, ('interval' in info ? info.interval * 1000 : 5000)));
        };
        timeout = setTimeout(poll, 3000);
      } catch (e) { if (!cancelled) setMessage(e instanceof Error ? e.message : 'Unable to pair'); }
    })();
    return () => { cancelled = true; if (timeout) clearTimeout(timeout); };
  }, [service]);
  return <View style={styles.page}><Text style={styles.brand}>FLIXOR <Text style={styles.muted}>TV</Text></Text>
    {!service ? <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Welcome to Flixor TV</Text>
      <Text style={styles.subtitle}>Connect your accounts using your phone. No remote keyboard needed.</Text>
      {(['plex', 'trakt'] as const).map(s => <Pressable key={s} focusable onPress={() => setService(s)} style={({ focused }) => [styles.button, focused && styles.focused]}>
        <Text style={styles.buttonText}>{connected[s] ? '✓ ' : '+ '}{s === 'plex' ? 'Plex' : 'Trakt'} {connected[s] ? 'connected' : 'connect'}</Text>
      </Pressable>)}
      <Text style={styles.note}>TV browsing and playback will be added in the next implementation stage.</Text>
    </ScrollView> : <View style={styles.content}>
      <Text style={styles.heading}>Connect {service === 'plex' ? 'Plex' : 'Trakt'}</Text>
      {pair ? <><Text style={styles.subtitle}>Visit {pair.url}</Text><Text selectable style={styles.code}>{pair.code}</Text></> : <ActivityIndicator size="large" />}
      <Text style={styles.subtitle}>{message}</Text>
      <Pressable focusable onPress={() => setService(null)} style={({ focused }) => [styles.button, focused && styles.focused]}><Text style={styles.buttonText}>Back</Text></Pressable>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0b0d13', paddingHorizontal: 72, paddingTop: 45 },
  brand: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  muted: { color: '#a3aab7' }, content: { paddingTop: 64, gap: 20, maxWidth: 850 },
  heading: { color: '#fff', fontSize: 42, fontWeight: '700' },
  subtitle: { color: '#c4cbd7', fontSize: 24 }, code: { color: '#fff', fontSize: 70, fontWeight: '800', letterSpacing: 9, marginVertical: 18 },
  button: { borderRadius: 12, backgroundColor: '#242936', padding: 20, minWidth: 360 },
  focused: { borderColor: '#fff', borderWidth: 3, backgroundColor: '#485577' },
  buttonText: { color: '#fff', fontSize: 26, fontWeight: '600' },
  note: { color: '#87909e', fontSize: 18, marginTop: 20 }
});
