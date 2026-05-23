/**
 * Global disclaimer banner — always visible at the top of every page.
 * Niro never gives final medical advice; this is the visible promise of that.
 */
export function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-sm text-center">
      <span className="font-medium">এটি চিকিৎসা পরামর্শ নয়।</span>{" "}
      <span>ডাক্তারের সাথে নিশ্চিত হোন।</span>
      <span className="hidden sm:inline ml-2 text-amber-700/80">
        · Not medical advice — always confirm with a doctor.
      </span>
    </div>
  );
}
