const { withAndroidManifest } = require('@expo/config-plugins');
module.exports = function withLeanback(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-feature'] = [...(manifest['uses-feature'] || []).filter(f => f.$['android:name'] !== 'android.hardware.touchscreen'), { $: { 'android:name': 'android.hardware.touchscreen', 'android:required': 'false' } }];
    const app = manifest.application[0];
    const activity = app.activity.find(a => a.$['android:name'] === '.MainActivity');
    if (!activity) throw new Error('MainActivity not found');
    activity['intent-filter'] = activity['intent-filter'] || [];
    if (!activity['intent-filter'].some(f => (f.category || []).some(c => c.$['android:name'] === 'android.intent.category.LEANBACK_LAUNCHER'))) {
      activity['intent-filter'].push({ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }], category: [{ $: { 'android:name': 'android.intent.category.LEANBACK_LAUNCHER' } }] });
    }
    return config;
  });
};
