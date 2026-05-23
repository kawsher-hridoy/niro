export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-12">
      <section className="max-w-2xl text-center flex flex-col gap-6">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-accent">
          নিরো
        </h1>
        <p className="text-xl sm:text-2xl text-foreground/80 font-medium">
          আপনার স্বাস্থ্য, আপন হাতে।
        </p>
        <p className="text-sm text-foreground/60">
          Niro — Bangladesh&apos;s first patient-owned medical record.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/signin"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition"
          >
            শুরু করুন · Get started
          </a>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-foreground/20 text-foreground/80 hover:bg-foreground/5 transition"
          >
            প্রজেক্ট সম্পর্কে · About
          </a>
        </div>
      </section>

      <section className="max-w-3xl grid sm:grid-cols-3 gap-6 mt-8 w-full">
        <FeatureCard
          title="AI ডকুমেন্ট বিশ্লেষণ"
          subtitle="Document analysis"
          body="প্রেসক্রিপশন বা রিপোর্টের ছবি তুলুন। AI বাংলায় বুঝিয়ে দেবে।"
        />
        <FeatureCard
          title="রোগী-নিয়ন্ত্রিত প্রোফাইল"
          subtitle="Patient-owned record"
          body="আপনার পুরো মেডিকেল হিস্ট্রি এক জায়গায় — সবসময় আপনার সাথে।"
        />
        <FeatureCard
          title="ডাক্তার যাচাই"
          subtitle="Doctor verification"
          body="BMDC-নিবন্ধিত ডাক্তার AI-এর বিশ্লেষণ যাচাই করেন।"
        />
      </section>

      <footer className="mt-16 text-xs text-foreground/40 text-center">
        IEEE ICADHI 2026 · Track 1 — AI-Driven Telemedicine · v0.1.0
      </footer>
    </main>
  );
}

type FeatureCardProps = {
  title: string;
  subtitle: string;
  body: string;
};

function FeatureCard({ title, subtitle, body }: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-foreground/10 p-5 bg-foreground/[0.02]">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-xs uppercase tracking-wide text-foreground/50 mt-1">
        {subtitle}
      </p>
      <p className="text-sm text-foreground/70 mt-3">{body}</p>
    </div>
  );
}
