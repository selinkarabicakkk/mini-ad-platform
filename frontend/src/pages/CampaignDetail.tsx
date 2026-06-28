import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCampaign, getStats } from '../api/campaigns'
import type { CampaignStatus } from '../types/campaign'

const STATUS_STYLES: Record<CampaignStatus, { badge: string; dot: string }> = {
  active:    { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  paused:    { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       dot: 'bg-amber-500'   },
  completed: { badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',      dot: 'bg-slate-400'   },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${s.badge}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => getCampaign(id!),
  })

  const { data: stats } = useQuery({
    queryKey: ['stats', id],
    queryFn: () => getStats(id!),
    refetchInterval: 3000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !campaign) {
    return (
      <div className="py-32 text-center">
        <p className="text-gray-400 text-sm">Campaign not found.</p>
        <Link to="/" className="mt-3 inline-block text-sm text-teal-600 hover:text-teal-700 font-medium">
          ← Back to Campaigns
        </Link>
      </div>
    )
  }

  const budgetUsed = campaign.initial_budget - campaign.budget
  const budgetPct  = campaign.initial_budget > 0
    ? Math.round((campaign.budget / campaign.initial_budget) * 100)
    : 0

  return (
    <div>
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-8 transition-colors">
        ← Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-gray-400">
            {formatDate(campaign.start_date)} — {formatDate(campaign.end_date)}
          </p>
        </div>
      </div>

      {/* Budget overview card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Budget Overview</h2>
          <span className="text-sm text-gray-400 tabular-nums">{budgetPct}% remaining</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-teal-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-6 mt-6 pt-5 border-t border-gray-50">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Initial Budget</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{campaign.initial_budget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Used</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{budgetUsed.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">Remaining</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{campaign.budget.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Live stats card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-gray-700">Live Statistics</h2>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Updates every 3s
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-5 bg-teal-50 rounded-xl">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">Total Impressions</p>
            <p className="text-4xl font-bold text-teal-700 tabular-nums">
              {stats ? stats.total_impressions.toLocaleString() : '—'}
            </p>
          </div>
          <div className="p-5 bg-amber-50 rounded-xl">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Spent Budget</p>
            <p className="text-4xl font-bold text-amber-700 tabular-nums">
              {stats ? stats.spent_budget.toLocaleString() : '—'}
            </p>
          </div>
          <div className="p-5 bg-emerald-50 rounded-xl">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">Remaining Budget</p>
            <p className="text-4xl font-bold text-emerald-700 tabular-nums">
              {stats ? stats.remaining_budget.toLocaleString() : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
