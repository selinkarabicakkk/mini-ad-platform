import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCampaigns } from '../api/campaigns'
import type { CampaignStatus } from '../types/campaign'

type FilterTab = CampaignStatus | 'all'

const TABS: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
]

const STATUS_STYLES: Record<CampaignStatus, { badge: string; dot: string }> = {
  active:    { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  paused:    { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       dot: 'bg-amber-500'   },
  completed: { badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',      dot: 'bg-slate-400'   },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CampaignList() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const { data: campaigns, isLoading, isError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
  })

  const filtered =
    !campaigns ? [] :
    activeTab === 'all' ? campaigns :
    campaigns.filter(c => c.status === activeTab)

  const totalCount  = campaigns?.length ?? 0
  const activeCount = campaigns?.filter(c => c.status === 'active').length ?? 0
  const pausedCount = campaigns?.filter(c => c.status === 'paused').length ?? 0

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and monitor your ad campaigns</p>
      </div>

      {/* Summary stat cards */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Active</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Paused</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pausedCount}</p>
          </div>
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {/* Filter tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-1">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-3 text-sm transition-colors mr-1 ${
                activeTab === tab.value
                  ? 'border-b-2 border-teal-600 text-teal-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="py-24 flex justify-center">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <div className="py-24 text-center text-sm text-red-500">
            Failed to load campaigns.
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-gray-400 text-sm">No campaigns found.</p>
            <Link to="/campaigns/new" className="mt-3 inline-block text-sm text-teal-600 hover:text-teal-700 font-medium">
              Create your first campaign →
            </Link>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70">
                {['Title', 'Status', 'Budget Used', 'Remaining', 'Start', 'End', ''].map(col => (
                  <th key={col} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(campaign => {
                const used = campaign.initial_budget - campaign.budget
                const pct  = campaign.initial_budget > 0 ? Math.round((used / campaign.initial_budget) * 100) : 0
                return (
                  <tr key={campaign.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900">{campaign.title}</td>
                    <td className="px-6 py-4"><StatusBadge status={campaign.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-gray-400 text-xs">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 tabular-nums">{campaign.budget.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(campaign.start_date)}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(campaign.end_date)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="text-teal-600 hover:text-teal-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
