import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCampaign, getStats } from '../api/campaigns'
import type { CampaignStatus } from '../types/campaign'

function statusBadgeClass(status: CampaignStatus): string {
  switch (status) {
    case 'active':    return 'bg-green-100 text-green-800'
    case 'paused':    return 'bg-yellow-100 text-yellow-800'
    case 'completed': return 'bg-gray-100 text-gray-700'
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA')
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          ← Back to Campaigns
        </Link>

        {isLoading && (
          <div className="py-16 text-center text-gray-500 text-sm">Loading...</div>
        )}

        {isError && (
          <div className="py-16 text-center text-red-500 text-sm">Campaign not found.</div>
        )}

        {campaign && (
          <>
            {/* Page heading */}
            <div className="flex items-center gap-3 mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">{campaign.title}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>

            {/* Campaign info */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Start Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(campaign.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">End Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(campaign.end_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Initial Budget</p>
                  <p className="text-sm font-medium text-gray-900">{campaign.initial_budget.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Live stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500 mb-4">Live Statistics</p>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats ? stats.total_impressions.toLocaleString() : '—'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Total Impressions</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats ? stats.spent_budget.toLocaleString() : '—'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Spent Budget</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats ? stats.remaining_budget.toLocaleString() : '—'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Remaining Budget</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
