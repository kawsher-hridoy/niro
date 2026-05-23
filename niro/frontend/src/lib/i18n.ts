/** Bangla numeral helper. ৫ instead of 5. */
const banglaDigits = "০১২৩৪৫৬৭৮৯";

export function toBangla(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => banglaDigits[+d]);
}

export function timeAgoBn(iso: string): string {
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "";
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return "এইমাত্র";
  if (diffSec < 3600) return `${toBangla(Math.floor(diffSec / 60))} মিনিট আগে`;
  if (diffSec < 86400) return `${toBangla(Math.floor(diffSec / 3600))} ঘন্টা আগে`;
  return `${toBangla(Math.floor(diffSec / 86400))} দিন আগে`;
}
