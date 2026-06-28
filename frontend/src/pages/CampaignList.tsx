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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
          <Link
            to="/campaigns/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            New Campaign
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Filter tabs */}
          <div className="flex border-b border-gray-200 px-4">
            {TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-3 text-sm transition-colors ${
                  activeTab === tab.value
                    ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {isLoading && (
            <div className="py-16 text-center text-gray-500 text-sm">Loading...</div>
          )}

          {isError && (
            <div className="py-16 text-center text-red-500 text-sm">
              Failed to load campaigns.
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="py-16 text-center text-gray-500 text-sm">
              No campaigns found. Create your first campaign.
            </div>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  {['Title', 'Status', 'Budget', 'Start Date', 'End Date', ''].map(col => (
                    <th
                      key={col}
                      className="px-4 py-3 font-semibold text-gray-600 bg-gray-50 border-b border-gray-200"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(campaign => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 border-b border-gray-100 font-medium text-gray-900">
                      {campaign.title}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-gray-700">
                      {campaign.budget.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-gray-700">
                      {formatDate(campaign.start_date)}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-gray-700">
                      {formatDate(campaign.end_date)}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
