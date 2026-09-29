// Off by default. No visitor IDs, cookies, query strings, referrers or search text.
// A receiving service must be explicitly configured before shared counts exist.
export function createTracker(endpoint, environment = globalThis) {
  let target;
  try { target = new URL(endpoint); } catch { return () => {}; }
  if (target.protocol !== 'https:' || target.username || target.password) return () => {};
  return (event, artwork = null) => {
    if (!['artwork_view','download_click','support_click'].includes(event)) return;
    if (environment.navigator?.globalPrivacyControl || environment.navigator?.doNotTrack === '1') return;
    if (artwork !== null && !/^[a-z0-9-]{1,80}$/.test(artwork)) return;
    try {
      Promise.resolve(environment.fetch(target.href, {method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,headers:{'Content-Type':'text/plain'},body:JSON.stringify({event,artwork})})).catch(()=>{});
    } catch { /* Analytics must never prevent a download or checkout. */ }
  };
}
