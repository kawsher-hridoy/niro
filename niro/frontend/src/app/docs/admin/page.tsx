"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Check,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { API_BASE, loadSession } from "@/lib/api";

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

export default function DocsAdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState<DocsConfig | null>(null);
  const [sections, setSections] = useState<DocsSection[]>([]);
  const [team, setTeam] = useState<DocsTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "sections" | "team">("config");
  const [editingSection, setEditingSection] = useState<DocsSection | null>(null);
  const [editingMember, setEditingMember] = useState<DocsTeamMember | null>(null);

  useEffect(() => {
    // Check if user is admin
    const session = loadSession();
    if (!session || session.role !== "admin") {
      router.push("/signin");
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = loadSession()?.access;
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      const [configRes, sectionsRes, teamRes] = await Promise.all([
        fetch(`${API_BASE}/docs/config`, { headers }),
        fetch(`${API_BASE}/docs/sections`, { headers }).catch(() => null),
        fetch(`${API_BASE}/docs/team`, { headers }).catch(() => null),
      ]);

      setConfig(await configRes.json());
      if (sectionsRes) setSections(await sectionsRes.json());
      if (teamRes) setTeam(await teamRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<DocsConfig>) => {
    setSaving(true);
    try {
      const token = loadSession()?.access;
      if (!token) return;

      const res = await fetch(`${API_BASE}/docs/config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        alert("Configuration updated successfully!");
      } else {
        alert("Failed to update configuration");
      }
    } catch (error) {
      console.error("Error updating config:", error);
      alert("Error updating configuration");
    } finally {
      setSaving(false);
    }
  };

  const saveSection = async (section: DocsSection) => {
    setSaving(true);
    try {
      const token = loadSession()?.access;
      if (!token) return;

      const res = await fetch(`${API_BASE}/docs/sections/${section.section_key}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: section.title,
          content: section.content,
          order: section.order,
        }),
      });

      if (res.ok) {
        await fetchData();
        setEditingSection(null);
        alert("Section updated successfully!");
      } else {
        alert("Failed to update section");
      }
    } catch (error) {
      console.error("Error saving section:", error);
      alert("Error saving section");
    } finally {
      setSaving(false);
    }
  };

  const saveMember = async (member: DocsTeamMember) => {
    setSaving(true);
    try {
      const token = loadSession()?.access;
      if (!token) return;

      const res = await fetch(`${API_BASE}/docs/team/${member.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: member.full_name,
          role: member.role,
          email: member.email,
          photo_url: member.photo_url,
          order: member.order,
        }),
      });

      if (res.ok) {
        await fetchData();
        setEditingMember(null);
        alert("Team member updated successfully!");
      } else {
        alert("Failed to update team member");
      }
    } catch (error) {
      console.error("Error saving member:", error);
      alert("Error saving team member");
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team member?")) return;

    setSaving(true);
    try {
      const token = loadSession()?.access;
      if (!token) return;

      const res = await fetch(`${API_BASE}/docs/team/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchData();
        alert("Team member deleted successfully!");
      } else {
        alert("Failed to delete team member");
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Error deleting team member");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          <p className="mt-4 text-[var(--color-muted)]">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-card)] border-b border-[var(--color-card-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/docs"
                className="flex items-center gap-2 text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Docs
              </Link>
              <h1 className="text-xl font-bold text-[var(--color-foreground)]">
                Documentation Admin
              </h1>
            </div>
            <Link
              href="/docs"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--color-card-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-[var(--color-card-border)]">
          <button
            onClick={() => setActiveTab("config")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "config"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            }`}
          >
            Visibility & Scheduling
          </button>
          <button
            onClick={() => setActiveTab("sections")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "sections"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            }`}
          >
            Content Sections
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "team"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            }`}
          >
            Team Members
          </button>
        </div>

        {/* Config Tab */}
        {activeTab === "config" && config && (
          <div className="max-w-2xl">
            <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
                  Public Access Control
                </h2>
                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-background)]">
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">
                      Documentation is {config.is_public ? "PUBLIC" : "PRIVATE"}
                    </p>
                    <p className="text-sm text-[var(--color-muted)] mt-1">
                      {config.is_available
                        ? "Currently accessible to visitors"
                        : config.message || "Not accessible"}
                    </p>
                  </div>
                  <button
                    onClick={() => updateConfig({ is_public: !config.is_public })}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      config.is_public
                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {config.is_public ? (
                      <>
                        <EyeOff className="w-4 h-4 inline mr-2" />
                        Make Private
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 inline mr-2" />
                        Make Public
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-[var(--color-foreground)] mb-3">
                  Scheduled Availability Window
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={config.start_datetime ? new Date(config.start_datetime).toISOString().slice(0, 16) : ""}
                      onChange={(e) => {
                        const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                        updateConfig({ start_datetime: value });
                      }}
                      className="w-full px-4 py-2 border border-[var(--color-card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={config.end_datetime ? new Date(config.end_datetime).toISOString().slice(0, 16) : ""}
                      onChange={(e) => {
                        const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                        updateConfig({ end_datetime: value });
                      }}
                      className="w-full px-4 py-2 border border-[var(--color-card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <button
                    onClick={() => updateConfig({ start_datetime: null, end_datetime: null })}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    Clear schedule (always available when public)
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--color-card-border)]">
                <h3 className="font-medium text-[var(--color-foreground)] mb-2">
                  Quick Presets
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      updateConfig({
                        is_public: true,
                        start_datetime: "2026-06-10T00:00:00Z",
                        end_datetime: "2026-06-14T23:59:59Z",
                      })
                    }
                    className="px-3 py-2 text-sm border border-[var(--color-card-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
                  >
                    <Calendar className="w-4 h-4 inline mr-1" />
                    ICADHI Judging (June 10-14)
                  </button>
                  <button
                    onClick={() =>
                      updateConfig({
                        is_public: true,
                        start_datetime: null,
                        end_datetime: null,
                      })
                    }
                    className="px-3 py-2 text-sm border border-[var(--color-card-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
                  >
                    <Check className="w-4 h-4 inline mr-1" />
                    Always Public
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sections Tab */}
        {activeTab === "sections" && (
          <div className="space-y-4">
            {sections.map((section) => (
              <div
                key={section.section_key}
                className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6"
              >
                {editingSection?.section_key === section.section_key ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editingSection.title}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, title: e.target.value })
                      }
                      className="w-full px-4 py-2 text-lg font-semibold border border-[var(--color-card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <textarea
                      value={editingSection.content}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, content: e.target.value })
                      }
                      rows={15}
                      className="w-full px-4 py-2 border border-[var(--color-card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveSection(editingSection)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        className="flex items-center gap-2 px-4 py-2 border border-[var(--color-card-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                          {section.title}
                        </h3>
                        <p className="text-sm text-[var(--color-muted)] mt-1">
                          Key: {section.section_key} • Order: {section.order}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingSection(section)}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--color-card-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    </div>
                    <div className="text-sm text-[var(--color-muted)] line-clamp-3">
                      {section.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="space-y-4">
            {team.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6"
              >
                {editingMember?.id === member.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={editingMember.full_name}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, full_name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-[var(--color-card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <input
                      type="text"
                      placeholder="Role"
                      value={editingMember.role}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, role: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-[var(--color-card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={editingMember.email}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, email: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-[var(--color-card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <input
                      type="url"
                      placeholder="Photo URL (optional)"
                      value={editingMember.photo_url || ""}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, photo_url: e.target.value || null })
                      }
                      className="w-full px-4 py-2 border border-[var(--color-card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveMember(editingMember)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingMember(null)}
                        className="flex items-center gap-2 px-4 py-2 border border-[var(--color-card-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center overflow-hidden shrink-0">
                        {member.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={member.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-[var(--color-primary)]">
                            {member.full_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                          {member.full_name}
                        </h3>
                        <p className="text-sm text-[var(--color-muted)] mt-1">{member.role}</p>
                        <p className="text-sm text-[var(--color-muted)] mt-1">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingMember(member)}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--color-card-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMember(member.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
