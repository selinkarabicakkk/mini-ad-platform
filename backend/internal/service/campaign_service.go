package service

import (
	"context"

	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/model"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/repository"
)

type CampaignService struct {
	repo repository.CampaignRepository
}

func NewCampaignService(repo repository.CampaignRepository) *CampaignService {
	return &CampaignService{repo: repo}
}

func (s *CampaignService) CreateCampaign(ctx context.Context, c model.Campaign) (model.Campaign, error) {
	return s.repo.Create(ctx, c)
}

func (s *CampaignService) ListCampaigns(ctx context.Context, statusFilter string) ([]model.Campaign, error) {
	return s.repo.List(ctx, statusFilter)
}

func (s *CampaignService) GetCampaign(ctx context.Context, id string) (model.Campaign, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *CampaignService) UpdateCampaign(ctx context.Context, id string, params repository.UpdateCampaignParams) (model.Campaign, error) {
	return s.repo.Update(ctx, id, params)
}

func (s *CampaignService) DeleteCampaign(ctx context.Context, id string) error {
	return s.repo.SoftDelete(ctx, id)
}

func (s *CampaignService) RecordImpression(ctx context.Context, id string) (remainingBudget int, err error) {
	return s.repo.DeductBudget(ctx, id)
}

func (s *CampaignService) GetStats(ctx context.Context, id string) (repository.Stats, error) {
	return s.repo.GetStats(ctx, id)
}
