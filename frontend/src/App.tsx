import { useState } from "react";
import LeadForm from "./components/LeadForm";
import AdminView from "./components/AdminView";

type Tab = "apply" | "admin";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("apply");

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Gold ingot icon */}
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L13 10.414V17a1 1 0 01-.293.707l-2 2A1 1 0 019 19v-8.586L5.293 6.707A1 1 0 015 6V4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Yellow Metal</h1>
              <p className="text-xs text-gray-500">Gold Loan Portal • RBI Licensed NBFC</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
            <button
              onClick={() => setActiveTab("apply")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "apply"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Apply
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "admin"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Admin
            </button>
          </nav>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {activeTab === "apply" ? <LeadForm /> : <AdminView />}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/60 py-6">
        <p className="text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Yellow Metal Finance Ltd. • RBI Licensed NBFC •
          Gold Rate: ₹6,200/g (mock)
        </p>
      </footer>
    </div>
  );
}
