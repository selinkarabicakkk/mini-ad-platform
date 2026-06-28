import axios from 'axios'
import type { Campaign, CreateCampaignRequest, UpdateCampaignRequest } from '../types/campaign'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })

export const getCampaigns = () =>
  api.get<Campaign[]>('/campaigns').then(r => r.data)

export const getCampaign = (id: string) =>
  api.get<Campaign>(`/campaigns/${id}`).then(r => r.data)

export const createCampaign = (body: CreateCampaignRequest) =>
  api.post<Campaign>('/campaigns', body).then(r => r.data)

export const updateCampaign = (id: string, body: UpdateCampaignRequest) =>
  api.put<Campaign>(`/campaigns/${id}`, body).then(r => r.data)

export const deleteCampaign = (id: string) =>
  api.delete(`/campaigns/${id}`)

export const recordImpression = (id: string) =>
  api.post(`/impression/${id}`)
