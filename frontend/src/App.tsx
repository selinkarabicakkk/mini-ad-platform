import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import CampaignList from './pages/CampaignList'
import NewCampaign from './pages/NewCampaign'
import CampaignDetail from './pages/CampaignDetail'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/gowit-icon.ico" alt="GoWit" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-gray-900 text-sm tracking-tight">GoWit</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">Ad Platform</span>
          </Link>
          <Link
            to="/campaigns/new"
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            + New Campaign
          </Link>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<CampaignList />} />
          <Route path="/campaigns/new" element={<NewCampaign />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
