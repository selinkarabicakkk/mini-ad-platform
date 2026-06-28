package model

import "time"

type CampaignStatus string

const (
	StatusActive    CampaignStatus = "active"
	StatusPaused    CampaignStatus = "paused"
	StatusCompleted CampaignStatus = "completed"
)

type Campaign struct {
	ID        string
	Title     string
	Budget    int
	StartDate time.Time
	EndDate   time.Time
	Status    CampaignStatus
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}
