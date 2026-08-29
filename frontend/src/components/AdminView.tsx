import { useState, useEffect, useMemo } from "react";
import { type LeadListItem, fetchLeads } from "../lib/api";

type SortOrder = "newest" | "oldest";

export default function AdminView() {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leads.");
    } finally {
      setLoading(false);
    }
  }

  const sortedLeads = useMemo(() => {
    const sorted = [...leads];
    sorted.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  }, [leads, sortOrder]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="ym-card overflow-hidden animate-fade-up">
        {/* Header */}
        <div className="p-6 border-b border-ym-border-light flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ym-gold uppercase tracking-widest mb-0.5">
              Dashboard
            </p>
            <h2 className="text-xl font-bold text-ym-charcoal">Partner Summary</h2>
            <p className="text-sm text-ym-text-secondary mt-0.5">
              {leads.length} application{leads.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              id="sort-order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="px-3 py-2 bg-ym-cream border border-ym-border rounded-lg text-ym-text text-sm focus:outline-none focus:ring-2 focus:ring-ym-gold/30 focus:border-ym-gold cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button
              id="btn-refresh"
              onClick={loadLeads}
              className="px-4 py-2 bg-ym-cream border border-ym-border rounded-lg text-ym-text text-sm hover:bg-ym-cream-dark transition-colors font-medium"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-ym-gold" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-ym-text-secondary">Loading applications…</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-ym-error mb-4">{error}</p>
            <button
              onClick={loadLeads}
              className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-ym-error text-sm hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-ym-cream-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-ym-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-ym-text font-medium">No applications yet</p>
            <p className="text-ym-text-secondary text-sm mt-1">
              Submit your first application to see it here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" id="leads-table">
              <thead>
                <tr className="border-b border-ym-border-light bg-ym-cream/60">
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-ym-text-secondary uppercase tracking-widest">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-ym-text-secondary uppercase tracking-widest">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold text-ym-text-secondary uppercase tracking-widest">
                    Net Wt
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-ym-text-secondary uppercase tracking-widest">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold text-ym-text-secondary uppercase tracking-widest">
                    Loan Value
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-ym-text-secondary uppercase tracking-widest">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ym-border-light">
                {sortedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-ym-cream/40 transition-colors">
                    <td className="px-6 py-4 text-sm text-ym-charcoal font-medium">{lead.customerName}</td>
                    <td className="px-6 py-4 text-sm text-ym-text-secondary font-mono tabular-nums">
                      {lead.maskedMobile}
                    </td>
                    <td className="px-6 py-4 text-sm text-ym-text text-right tabular-nums font-medium">
                      {lead.netWeightGrams}g
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-ym-gold-50 text-ym-gold-dark border border-ym-gold-200 uppercase tracking-wide">
                        {lead.selectedPlan.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-ym-gold-dark font-bold text-right tabular-nums">
                      {formatCurrency(lead.maxEligibleLoanAmount)}
                    </td>
                    <td className="px-6 py-4 text-xs text-ym-text-secondary">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
