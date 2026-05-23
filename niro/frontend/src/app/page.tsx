import Link from "next/link";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <Features />
        <HowItWorks />
        <FinalCTA />
      </main>
      <SiteFooter />
    </>
  );
}

function SiteNav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-[var(--color-card-border)] bg-[var(--color-background)]/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-[var(--color-primary)]"
        >
          নিরো
        </Link>
        <Link
          href="/signin"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-accent-soft)] transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          সাইন ইন
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 w-[640px] h-[640px] rounded-full bg-[var(--color-accent-soft)] blur-3xl opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -left-40 w-[480px] h-[480px] rounded-full bg-[var(--color-accent-soft)] blur-3xl opacity-50"
      />
      <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6 text-center md:text-left">
          <span className="inline-flex w-fit mx-auto md:mx-0 items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-primary)] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
            AI-চালিত · বাংলায়
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-[var(--color-foreground)]">
            আপনার স্বাস্থ্য,
            <br />
            <span className="text-[var(--color-primary)]">আপন হাতে।</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-muted)] leading-relaxed max-w-xl mx-auto md:mx-0">
            প্রেসক্রিপশন, রিপোর্ট, পুরো মেডিকেল ইতিহাস — সব এক অ্যাপে। AI বাংলায়
            ব্যাখ্যা করে, BMDC-নিবন্ধিত ডাক্তার যাচাই করেন।
          </p>
          <div className="flex flex-col sm:flex-row items-center md:items-start gap-3 mt-2">
            <Link
              href="/signin"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)] hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              শুরু করুন
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="ml-2 w-4 h-4"
                fill="currentColor"
              >
                <path d="M10.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z" />
              </svg>
            </Link>
            <span className="text-sm text-[var(--color-muted)]">
              ফ্রি · ৩০ সেকেন্ডে শুরু
            </span>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-[280px] h-[570px] rounded-[2.75rem] border-[10px] border-[#1a1f1c] bg-[var(--color-card)] shadow-2xl overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1a1f1c] rounded-b-2xl z-10" />
      <div className="h-full flex flex-col px-4 pt-8 pb-4 gap-3">
        <div className="flex justify-between items-center text-[10px] text-[var(--color-muted)] font-medium px-1">
          <span>৯:৪১</span>
          <span>•••</span>
        </div>

        <div className="mt-1">
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
            প্রেসক্রিপশন
          </p>
          <h3 className="text-base font-semibold text-[var(--color-foreground)] mt-0.5">
            AI বিশ্লেষণ
          </h3>
        </div>

        <div className="inline-flex w-fit items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-primary)] text-[10px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
          উচ্চ আস্থা · ৯২%
        </div>

        <div className="rounded-lg border border-[var(--color-card-border)] p-2.5 bg-[var(--color-background)]">
          <p className="text-[11px] font-semibold text-[var(--color-foreground)]">
            Metformin ৫০০mg
          </p>
          <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
            খাবারের পর · দিনে ২ বার
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-card-border)] p-2.5 bg-[var(--color-background)]">
          <p className="text-[11px] font-semibold text-[var(--color-foreground)]">
            Amlodipine ৫mg
          </p>
          <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
            সকালে · দিনে ১ বার
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <p className="text-[10px] font-semibold text-amber-800 flex items-center gap-1">
            <span aria-hidden>⚠</span> গুরুত্বপূর্ণ
          </p>
          <p className="text-[10px] text-amber-700 mt-0.5 leading-snug">
            রক্তচাপ নিয়মিত মাপুন
          </p>
        </div>

        <button
          type="button"
          tabIndex={-1}
          className="mt-auto w-full rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold py-2.5"
        >
          ডাক্তার যাচাই করুন
        </button>
      </div>
    </div>
  );
}

function TrustStrip() {
  return (
    <section className="border-y border-[var(--color-card-border)] bg-[var(--color-card)]">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <Stat number="৬+" label="যাচাইকৃত ডাক্তার" />
        <Stat number="১০০%" label="বাংলা সাপোর্ট" />
        <Stat number="০৳" label="শুরু করতে" />
        <Stat number="২৪/৭" label="AI সহায়তা" />
      </div>
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <p className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-primary)]">
        {number}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function Features() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
          কেন নিরো
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-foreground)]">
          আপনার মেডিকেল রেকর্ড, আপনার নিয়ন্ত্রণে
        </h2>
        <p className="mt-4 text-base text-[var(--color-muted)]">
          প্রতিটি প্রেসক্রিপশন আর রিপোর্ট এক জায়গায়। AI ব্যাখ্যা দেয়, ডাক্তার
          নিশ্চিত করেন।
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 mt-14">
        <FeatureCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path
                d="M9 2v6a3 3 0 003 3 3 3 0 003-3V2M9 2H7M9 2h6M15 2h2M6 11a6 6 0 1012 0M9 17v3a2 2 0 002 2h2a2 2 0 002-2v-3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="AI ডকুমেন্ট বিশ্লেষণ"
          body="প্রেসক্রিপশন বা রিপোর্টের ছবি তুলুন। AI বাংলায় ওষুধ, ডোজ, সতর্কতা — সব বুঝিয়ে দেবে।"
        />
        <FeatureCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="রোগী-নিয়ন্ত্রিত প্রোফাইল"
          body="আপনার পুরো মেডিকেল হিস্ট্রি এক জায়গায় — সবসময় আপনার সাথে। কে দেখবে, কখন দেখবে — আপনি ঠিক করেন।"
        />
        <FeatureCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="ডাক্তার যাচাই"
          body="BMDC-নিবন্ধিত বিশেষজ্ঞ ডাক্তার আপনার AI বিশ্লেষণ পর্যালোচনা করেন — মাত্র ৳২০০ থেকে শুরু।"
        />
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-7 hover:shadow-md transition">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-primary)]">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[var(--color-foreground)]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
        {body}
      </p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="bg-[var(--color-card)] border-y border-[var(--color-card-border)]">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            কীভাবে কাজ করে
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-foreground)]">
            তিনটি সহজ ধাপ
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-10 mt-14">
          <Step
            number="১"
            title="ছবি তুলুন"
            body="প্রেসক্রিপশন বা রিপোর্টের একটা ছবি তুলুন বা গ্যালারি থেকে আপলোড করুন।"
          />
          <Step
            number="২"
            title="AI বিশ্লেষণ পান"
            body="কয়েক সেকেন্ডে বাংলায় বিস্তারিত ব্যাখ্যা — ওষুধ, ডোজ, সতর্কতা, লাল পতাকা।"
          />
          <Step
            number="৩"
            title="ডাক্তার যাচাই (ঐচ্ছিক)"
            body="চাইলে BMDC-নিবন্ধিত ডাক্তারের রিভিউ নিন। আপনার মেডিকেল হিস্ট্রি কাজে লাগিয়ে।"
          />
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center md:text-left">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] text-white text-xl font-bold">
        {number}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[var(--color-foreground)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        {body}
      </p>
    </div>
  );
}

function FinalCTA() {
  return (
    <section className="bg-[var(--color-accent-soft)]">
      <div className="max-w-4xl mx-auto px-6 py-20 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-foreground)]">
          আজই শুরু করুন
        </h2>
        <p className="mt-4 text-base md:text-lg text-[var(--color-muted)] max-w-xl mx-auto">
          পরের প্রেসক্রিপশন বা রিপোর্ট থেকেই — আপনার মেডিকেল হিস্ট্রি গড়ে তুলুন।
        </p>
        <div className="mt-8">
          <Link
            href="/signin"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)] hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            শুরু করুন
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-card-border)]">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
        <p>© নিরো</p>
        <p>বাংলাদেশের জন্য, বাংলায়।</p>
      </div>
    </footer>
  );
}
