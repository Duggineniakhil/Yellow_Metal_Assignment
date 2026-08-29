import { useState } from "react";
import LeadForm from "./components/LeadForm";
import AdminView from "./components/AdminView";

type Tab = "apply" | "admin";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("apply");

  return (
    <div className="min-h-screen bg-ym-cream">
      {/* ── Decorative gold line at top ─────────────────────────────────── */}
      <div className="ym-gold-line" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-ym-border-light sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            {/* YM Logo Mark */}
            <img
              src="/ym-logo.svg"
              alt="Yellow Metal"
              className="w-11 h-11"
            />
            <div>
              <h1 className="text-lg font-bold text-ym-charcoal tracking-tight leading-tight">
                Yellow Metal
              </h1>
              <p className="text-[11px] text-ym-text-secondary font-medium tracking-wide uppercase">
                A RBI Licensed NBFC
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-0.5 bg-ym-cream-dark rounded-xl p-1 border border-ym-border-light">
            <button
              id="tab-apply"
              onClick={() => setActiveTab("apply")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "apply"
                  ? "bg-white text-ym-charcoal shadow-sm border border-ym-border-light"
                  : "text-ym-text-secondary hover:text-ym-text"
              }`}
            >
              Apply
            </button>
            <button
              id="tab-admin"
              onClick={() => setActiveTab("admin")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "admin"
                  ? "bg-white text-ym-charcoal shadow-sm border border-ym-border-light"
                  : "text-ym-text-secondary hover:text-ym-text"
              }`}
            >
              Partner View
            </button>
          </nav>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {activeTab === "apply" ? <LeadForm /> : <AdminView />}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-ym-border-light py-8 mt-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs text-ym-text-secondary">
            © {new Date().getFullYear()} Yellow Metal Finance Ltd. · RBI Licensed NBFC ·
            Gold Rate: ₹6,200/g (indicative)
          </p>
          <p className="text-[10px] text-ym-border mt-2">
            Gold loans are subject to eligibility. Terms and conditions apply.
          </p>
        </div>
      </footer>
    </div>
  );
}
