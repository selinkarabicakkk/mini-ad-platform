package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/model"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/repository"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/service"
)

const dateLayout = "2006-01-02"

var validStatuses = map[string]bool{
	"active":    true,
	"paused":    true,
	"completed": true,
}

type CampaignHandler struct {
	svc *service.CampaignService
}

func NewCampaignHandler(svc *service.CampaignService) *CampaignHandler {
	return &CampaignHandler{svc: svc}
}

func (h *CampaignHandler) RegisterRoutes(r chi.Router) {
	r.Post("/campaigns", h.CreateCampaign)
	r.Get("/campaigns", h.ListCampaigns)
	r.Get("/campaigns/{id}", h.GetCampaign)
	r.Put("/campaigns/{id}", h.UpdateCampaign)
	r.Delete("/campaigns/{id}", h.DeleteCampaign)
	r.Post("/impression/{id}", h.RecordImpression)
	r.Get("/stats/{id}", h.GetStats)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func parseDateParam(s string) (time.Time, error) {
	return time.Parse(dateLayout, s)
}

type createRequest struct {
	Title     string `json:"title"`
	Budget    int    `json:"budget"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Status    string `json:"status"`
}

type updateRequest struct {
	Title     *string `json:"title"`
	Budget    *int    `json:"budget"`
	StartDate *string `json:"start_date"`
	EndDate   *string `json:"end_date"`
	Status    *string `json:"status"`
}

func (h *CampaignHandler) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid request body")
		return
	}
	if req.Title == "" || req.Budget < 0 || req.StartDate == "" || req.EndDate == "" {
		writeError(w, http.StatusUnprocessableEntity, "title, budget, start_date, end_date are required")
		return
	}
	start, err := parseDateParam(req.StartDate)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid start_date: use YYYY-MM-DD")
		return
	}
	end, err := parseDateParam(req.EndDate)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid end_date: use YYYY-MM-DD")
		return
	}

	status := model.StatusActive
	if req.Status != "" {
		if !validStatuses[req.Status] {
			writeError(w, http.StatusUnprocessableEntity, "status must be active, paused, or completed")
			return
		}
		status = model.CampaignStatus(req.Status)
	}

	c, err := h.svc.CreateCampaign(r.Context(), model.Campaign{
		Title:     req.Title,
		Budget:    req.Budget,
		StartDate: start,
		EndDate:   end,
		Status:    status,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (h *CampaignHandler) ListCampaigns(w http.ResponseWriter, r *http.Request) {
	statusFilter := r.URL.Query().Get("status")
	if statusFilter != "" && !validStatuses[statusFilter] {
		writeError(w, http.StatusUnprocessableEntity, "status must be active, paused, or completed")
		return
	}

	campaigns, err := h.svc.ListCampaigns(r.Context(), statusFilter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if campaigns == nil {
		campaigns = []model.Campaign{}
	}
	writeJSON(w, http.StatusOK, campaigns)
}

func (h *CampaignHandler) GetCampaign(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	c, err := h.svc.GetCampaign(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *CampaignHandler) UpdateCampaign(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid request body")
		return
	}

	params := repository.UpdateCampaignParams{}

	if req.Title != nil {
		params.Title = req.Title
	}
	if req.Budget != nil {
		params.Budget = req.Budget
	}
	if req.StartDate != nil {
		t, err := parseDateParam(*req.StartDate)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "invalid start_date: use YYYY-MM-DD")
			return
		}
		params.StartDate = &t
	}
	if req.EndDate != nil {
		t, err := parseDateParam(*req.EndDate)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "invalid end_date: use YYYY-MM-DD")
			return
		}
		params.EndDate = &t
	}
	if req.Status != nil {
		if !validStatuses[*req.Status] {
			writeError(w, http.StatusUnprocessableEntity, "status must be active, paused, or completed")
			return
		}
		s := model.CampaignStatus(*req.Status)
		params.Status = &s
	}

	c, err := h.svc.UpdateCampaign(r.Context(), id, params)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *CampaignHandler) DeleteCampaign(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	err := h.svc.DeleteCampaign(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CampaignHandler) RecordImpression(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	remaining, err := h.svc.RecordImpression(r.Context(), id)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]int{"remaining_budget": remaining})
		return
	}

	if errors.Is(err, repository.ErrBudgetExhausted) {
		// Distinguish "budget is 0" from "campaign doesn't exist" — check existence on error path only.
		_, getErr := h.svc.GetCampaign(r.Context(), id)
		if errors.Is(getErr, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "campaign not found")
			return
		}
		writeError(w, http.StatusConflict, "budget exhausted")
		return
	}

	writeError(w, http.StatusInternalServerError, "internal server error")
}

func (h *CampaignHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	stats, err := h.svc.GetStats(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{
		"total_impressions": stats.TotalImpressions,
		"spent_budget":      stats.SpentBudget,
		"remaining_budget":  stats.RemainingBudget,
	})
}
