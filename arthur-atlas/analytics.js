// Use the existing website property; never count local previews.
(() => {
  if (!['emileokada.com', 'www.emileokada.com', 'emileokada.github.io'].includes(location.hostname)) return;
  if (window.atlasAnalyticsLoaded) return;
  window.atlasAnalyticsLoaded = true;
  const measurementId = 'G-STKC8JN3WM';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);
})();
