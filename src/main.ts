import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import { app } from './lib/store.svelte';
import './app.css';

registerSW({
  immediate: true,
  onOfflineReady() {
    app.offlineReady = true;
  },
  onRegisteredSW(_url, registration) {
    // Een service worker die al actief is, betekent dat de app al offline klaarstaat.
    if (registration?.active) app.offlineReady = true;
  },
});

const target = document.getElementById('app');
if (!target) throw new Error('Element #app ontbreekt in index.html');

export default mount(App, { target });
