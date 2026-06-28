import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CampaignList from './pages/CampaignList'
import NewCampaign from './pages/NewCampaign'
import CampaignDetail from './pages/CampaignDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CampaignList />} />
        <Route path="/campaigns/new" element={<NewCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
      </Routes>
    </BrowserRouter>
  )
}
