"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  BookOpen,
  CheckCircle,
  Clock,
  Code,
  Database,
  FileText,
  Lock,
  Mail,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { toBangla } from "@/lib/i18n";

interface DocsConfig {
  is_available: boolean;
  is_public: boolean;
  start_datetime: string | null;
  end_datetime: string | null;
  message: string | null;
}

interface DocsSection {
  section_key: string;
  title: string;
  content: string;
  order: number;
}

interface DocsTeamMember {
  id: string;
  full_name: string;
  role: string;
  email: string;
  photo_url: string | null;
  order: number;
}

interface DocsLiveStats {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_documents: number;
  total_analyses: number;
  total_verifications: number;
  avg_confidence: number;
  total_health_metrics: number;
  total_conversations: number;
  total_chamber_sessions: number;
}

interface DocsFeature {
  name: string;
  description: string;
  status: "live" | "beta" | "planned";
  count: number | null;
}

interface DocsTechStack {
  category: string;
  items: Array<{ name: string; version: string; purpose: string }>;
}

export default function DocsPage() {
  const [config, setConfig] = useState<DocsConfig | null>(null);
  const [sections, setSections] = useState<DocsSection[]>([]);
  const [team, setTeam] = useState<DocsTeamMember[]>([]);
  const [stats, setStats] = useState<DocsLiveStats | null>(null);
  const [features, setFeatures] = useState<DocsFeature[]>([]);
  const [techStack, setTechStack] = useState<DocsTechStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    fetchDocsData();
  }, []);

  const fetchDocsData = async () => {
    try {
      // Check availability first
      const configRes = await fetch("/api/v1/docs/config");
      const configData: DocsConfig = await configRes.json();
      setConfig(configData);

      if (!configData.is_available) {
        setLoading(false);
        return;
      }

      // Fetch all docs data in parallel
      const [sectionsRes, teamRes, statsRes, featuresRes, techStackRes] = await Promise.all([
        fetch("/api/v1/docs/sections"),
        fetch("/api/v1/docs/team"),
        fetch("/api/v1/docs/live-stats"),
        fetch("/api/v1/docs/features"),
        fetch("/api/v1/docs/tech-stack"),
      ]);

      setSections(await sectionsRes.json());
      setTeam(await teamRes.json());
      setStats(await statsRes.json());
      setFeatures(await featuresRes.json());
      setTechStack(await techStackRes.json());
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = document.querySelectorAll("[data-section]");
      let current = "";

      sectionElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          current = element.getAttribute("data-section") || "";
        }
      });

      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          <p className="mt-4 text-[var(--color-muted)]">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (!config?.is_available) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-full bg-amber-50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
            Documentation Not Available
          </h1>
          <p className="text-[var(--color-muted)] mb-6">
            {config?.message || "The documentation is currently not accessible."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const sectionMap = sections.reduce((acc, section) => {
    acc[section.section_key] = section;
    return acc;
  }, {} as Record<string, DocsSection>);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-card)] border-b border-[var(--color-card-border)] backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[var(--color-foreground)]">Niro Docs</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                Home
              </Link>
              <button
                onClick={() => window.print()}
                className="text-sm px-4 py-2 border border-[var(--color-card-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block w-64 shrink-0">
            <nav className="sticky top-24 space-y-1">
              <NavSection title="Pitch Deck" sections={[
                { key: "problem", label: "Problem" },
                { key: "solution", label: "Solution" },
                { key: "why_now", label: "Why Now" },
                { key: "traction", label: "Traction" },
                { key: "market", label: "Market" },
                { key: "business_model", label: "Business Model" },
                { key: "competition", label: "Competition" },
                { key: "go_to_market", label: "Go-To-Market" },
                { key: "team", label: "Team" },
                { key: "vision", label: "Vision" },
              ]} activeSection={activeSection} />

              <NavSection title="Technical" sections={[
                { key: "features", label: "Features" },
                { key: "architecture", label: "Architecture" },
                { key: "tech-stack", label: "Tech Stack" },
                { key: "security", label: "Security" },
                { key: "ai_safety", label: "AI Safety" },
                { key: "roadmap", label: "Roadmap" },
              ]} activeSection={activeSection} />
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Hero */}
            <section className="mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-foreground)] mb-4">
                Niro
              </h1>
              <p className="text-xl text-[var(--color-muted)] mb-6">
                Bangladesh's first patient-owned medical record with AI-powered document analysis
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Live System
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  AI-Powered
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                  <Lock className="w-4 h-4" />
                  Privacy-First
                </span>
              </div>
            </section>

            {/* Live Stats */}
            {stats && (
              <section className="mb-16" data-section="traction">
                <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-6">
                  Live System Statistics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={<Users />} label="Total Users" value={stats.total_users} />
                  <StatCard icon={<FileText />} label="Documents" value={stats.total_documents} />
                  <StatCard icon={<Sparkles />} label="AI Analyses" value={stats.total_analyses} />
                  <StatCard icon={<CheckCircle />} label="Verifications" value={stats.total_verifications} />
                  <StatCard icon={<Activity />} label="Health Metrics" value={stats.total_health_metrics} />
                  <StatCard icon={<Users />} label="Conversations" value={stats.total_conversations} />
                  <StatCard icon={<TrendingUp />} label="Avg Confidence" value={`${(stats.avg_confidence * 100).toFixed(1)}%`} />
                  <StatCard icon={<Users />} label="Chamber Sessions" value={stats.total_chamber_sessions} />
                </div>
              </section>
            )}

            {/* Pitch Deck Sections */}
            {["problem", "solution", "why_now", "market", "business_model", "competition", "go_to_market", "vision"].map((key) => {
              const section = sectionMap[key];
              if (!section) return null;
              return (
                <ContentSection
                  key={key}
                  sectionKey={key}
                  title={section.title}
                  content={section.content}
                />
              );
            })}

            {/* Team Section */}
            {team.length > 0 && (
              <section className="mb-16" data-section="team">
                <h2 className="text-3xl font-bold text-[var(--color-foreground)] mb-6">
                  Team
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {team.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 text-center"
                    >
                      <div className="w-24 h-24 rounded-full bg-[var(--color-accent-soft)] mx-auto mb-4 flex items-center justify-center overflow-hidden">
                        {member.photo_url ? (
                          <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-12 h-12 text-[var(--color-primary)]" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">
                        {member.full_name}
                      </h3>
                      <p className="text-sm text-[var(--color-muted)] mb-3">{member.role}</p>
                      <a
                        href={`mailto:${member.email}`}
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
                      >
                        <Mail className="w-4 h-4" />
                        {member.email}
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Features Matrix */}
            {features.length > 0 && (
              <section className="mb-16" data-section="features">
                <h2 className="text-3xl font-bold text-[var(--color-foreground)] mb-6">
                  Feature Matrix
                </h2>
                <div className="space-y-4">
                  {features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                              {feature.name}
                            </h3>
                            <StatusBadge status={feature.status} />
                          </div>
                          <p className="text-sm text-[var(--color-muted)]">{feature.description}</p>
                        </div>
                        {feature.count !== null && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-[var(--color-primary)]">
                              {toBangla(feature.count)}
                            </div>
                            <div className="text-xs text-[var(--color-muted)]">total</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tech Stack */}
            {techStack.length > 0 && (
              <section className="mb-16" data-section="tech-stack">
                <h2 className="text-3xl font-bold text-[var(--color-foreground)] mb-6">
                  Technology Stack
                </h2>
                <div className="space-y-6">
                  {techStack.map((category, idx) => (
                    <div key={idx}>
                      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3 flex items-center gap-2">
                        <CategoryIcon category={category.category} />
                        {category.category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] p-4"
                          >
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-semibold text-[var(--color-foreground)]">{item.name}</span>
                              <span className="text-sm text-[var(--color-muted)]">{item.version}</span>
                            </div>
                            <p className="text-sm text-[var(--color-muted)]">{item.purpose}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Technical Sections */}
            {["architecture", "security", "ai_safety", "roadmap"].map((key) => {
              const section = sectionMap[key];
              if (!section) return null;
              return (
                <ContentSection
                  key={key}
                  sectionKey={key}
                  title={section.title}
                  content={section.content}
                />
              );
            })}

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-[var(--color-card-border)]">
              <div className="text-center text-sm text-[var(--color-muted)]">
                <p>© 2026 Niro. Built for IEEE ICADHI 2026 Project Showcase.</p>
                <p className="mt-2">
                  <Link href="/" className="text-[var(--color-primary)] hover:underline">
                    nirobd.tech
                  </Link>
                </p>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavSection({
  title,
  sections,
  activeSection,
}: {
  title: string;
  sections: Array<{ key: string; label: string }>;
  activeSection: string;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-1">
        {sections.map((section) => (
          <a
            key={section.key}
            href={`#${section.key}`}
            className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
              activeSection === section.key
                ? "bg-[var(--color-accent-soft)] text-[var(--color-primary)] font-medium"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-background)]"
            }`}
          >
            {section.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function ContentSection({
  sectionKey,
  title,
  content,
}: {
  sectionKey: string;
  title: string;
  content: string;
}) {
  return (
    <section id={sectionKey} data-section={sectionKey} className="mb-16 scroll-mt-24">
      <h2 className="text-3xl font-bold text-[var(--color-foreground)] mb-6">{title}</h2>
      <div className="prose prose-lg max-w-none">
        <div
          className="text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
        />
      </div>
    </section>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center gap-2 text-[var(--color-primary)] mb-2">
        {icon}
      </div>
      <div className="text-2xl font-bold text-[var(--color-foreground)] mb-1">
        {typeof value === "number" ? toBangla(value) : value}
      </div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "live" | "beta" | "planned" }) {
  const styles = {
    live: "bg-green-50 text-green-700",
    beta: "bg-blue-50 text-blue-700",
    planned: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, React.ReactNode> = {
    Frontend: <Code className="w-5 h-5" />,
    Backend: <Database className="w-5 h-5" />,
    Database: <Database className="w-5 h-5" />,
    "AI & ML": <Sparkles className="w-5 h-5" />,
    Infrastructure: <Activity className="w-5 h-5" />,
  };

  return icons[category] || <FileText className="w-5 h-5" />;
}

function formatMarkdown(content: string): string {
  // Simple markdown-to-HTML conversion
  let html = content;

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Lists - split into lines first to avoid regex issues
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    if (/^\d+\.\s+/.test(line)) {
      return line.replace(/^(\d+)\.\s+(.+)$/, "<li>$2</li>");
    } else if (/^-\s+/.test(line)) {
      return line.replace(/^-\s+(.+)$/, "<li>$1</li>");
    }
    return line;
  });
  html = processedLines.join('\n');

  // Wrap consecutive list items in ul tags
  const ulRegex = new RegExp('(<li>.*</li>)', 's');
  html = html.replace(ulRegex, "<ul>$1</ul>");

  // Paragraphs
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  // Tables (basic support)
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split("|").filter((c) => c.trim());
    return `<tr>${cells.map((c) => `<td>${c.trim()}</td>`).join("")}</tr>`;
  });
  const tableRegex = new RegExp('(<tr>.*</tr>)', 's');
  html = html.replace(tableRegex, '<table class="w-full border-collapse my-4">$1</table>');

  return html;
}
