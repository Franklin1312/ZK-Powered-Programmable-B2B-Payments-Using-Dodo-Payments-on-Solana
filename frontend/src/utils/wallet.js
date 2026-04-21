export function getPhantomProvider() {
  if (window?.phantom?.solana?.isPhantom) {
    return window.phantom.solana;
  }

  const injected = window?.solana;
  if (injected?.isPhantom) {
    return injected;
  }

  const providers = injected?.providers;
  if (Array.isArray(providers)) {
    return providers.find((provider) => provider?.isPhantom) || null;
  }

  return null;
}