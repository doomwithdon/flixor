// Device pairing: secrets must be provisioned via build-time configuration, never logged.
const PLEX_HEADERS = { Accept: 'application/json', 'X-Plex-Product': 'Flixor TV', 'X-Plex-Client-Identifier': 'flixor-tv' };
async function json(response: Response) { if (!response.ok) throw new Error('Pairing request failed (' + response.status + ')'); return response.json(); }
export async function plexCode() {
  const pin = await json(await fetch('https://plex.tv/api/v2/pins?strong=true', { method: 'POST', headers: PLEX_HEADERS }));
  return { id: pin.id as number, code: pin.code as string, url: 'https://plex.tv/link' };
}
export async function plexPoll(id: number): Promise<string | null> {
  const pin = await json(await fetch('https://plex.tv/api/v2/pins/' + id, { headers: PLEX_HEADERS }));
  return pin.authToken || null;
}
const TRAKT_CLIENT_ID = process.env.EXPO_PUBLIC_TRAKT_CLIENT_ID || '';
export async function traktCode() {
  if (!TRAKT_CLIENT_ID) throw new Error('Configure EXPO_PUBLIC_TRAKT_CLIENT_ID');
  const d = await json(await fetch('https://api.trakt.tv/oauth/device/code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: TRAKT_CLIENT_ID }) }));
  return { code: d.user_code as string, url: d.verification_url as string, deviceCode: d.device_code as string, interval: d.interval as number, expiresIn: d.expires_in as number };
}
export async function traktPoll(deviceCode: string): Promise<string | null> {
  const response = await fetch('https://api.trakt.tv/oauth/device/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: deviceCode, client_id: TRAKT_CLIENT_ID, client_secret: process.env.EXPO_PUBLIC_TRAKT_CLIENT_SECRET || '' }) });
  if (response.status === 400 || response.status === 404 || response.status === 409 || response.status === 410 || response.status === 418 || response.status === 429) return null;
  return (await json(response)).access_token || null;
}
