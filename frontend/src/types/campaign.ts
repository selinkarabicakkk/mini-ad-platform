export type CampaignStatus = 'active' | 'paused' | 'completed'

export interface Campaign {
  id: string
  title: string
  budget: number
  initial_budget: number
  start_date: string
  end_date: string
  status: CampaignStatus
  created_at: string
  updated_at: string
}

export interface CreateCampaignRequest {
  title: string
  budget: number
  start_date: string
  end_date: string
  status?: CampaignStatus
}

export interface UpdateCampaignRequest {
  title?: string
  budget?: number
  start_date?: string
  end_date?: string
  status?: CampaignStatus
}

export interface CampaignStats {
  total_impressions: number
  spent_budget: number
  remaining_budget: number
}
