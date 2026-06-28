package model

import "time"

type CampaignStatus string

const (
	StatusActive    CampaignStatus = "active"
	StatusPaused    CampaignStatus = "paused"
	StatusCompleted CampaignStatus = "completed"
)

type Campaign struct {
	ID            string         `json:"id"`
	Title         string         `json:"title"`
	Budget        int            `json:"budget"`
	InitialBudget int            `json:"initial_budget"`
	StartDate     time.Time      `json:"start_date"`
	EndDate       time.Time      `json:"end_date"`
	Status        CampaignStatus `json:"status"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     *time.Time     `json:"-"`
}
