// Service Worker for Family Budget PWA
const CACHE_NAME = 'family-budget-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle all fetch requests normally
  // This is a minimal service worker just for PWA installability
  return;
});
