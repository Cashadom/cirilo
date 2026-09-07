export function makePublicShareUrl(publicId){const base=typeof window!=='undefined'?window.location.origin:'https://cirilo.app';return `${base}/?public=${encodeURIComponent(publicId)}`}
export async function copyPublicShareUrl(publicId){const url=makePublicShareUrl(publicId);if(navigator?.clipboard?.writeText)await navigator.clipboard.writeText(url);return url}
