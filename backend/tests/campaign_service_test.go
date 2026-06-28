package tests

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/model"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/repository"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/service"
)

// mockRepo is a configurable mock for repository.CampaignRepository.
// Each test sets only the fn fields it needs; unset fields panic if called.
type mockRepo struct {
	createFn       func(ctx context.Context, c model.Campaign) (model.Campaign, error)
	listFn         func(ctx context.Context, statusFilter string) ([]model.Campaign, error)
	getByIDFn      func(ctx context.Context, id string) (model.Campaign, error)
	updateFn       func(ctx context.Context, id string, params repository.UpdateCampaignParams) (model.Campaign, error)
	softDeleteFn   func(ctx context.Context, id string) error
	deductBudgetFn func(ctx context.Context, id string) (int, error)
	getStatsFn     func(ctx context.Context, id string) (repository.Stats, error)
}

func (m *mockRepo) Create(ctx context.Context, c model.Campaign) (model.Campaign, error) {
	return m.createFn(ctx, c)
}
func (m *mockRepo) List(ctx context.Context, statusFilter string) ([]model.Campaign, error) {
	return m.listFn(ctx, statusFilter)
}
func (m *mockRepo) GetByID(ctx context.Context, id string) (model.Campaign, error) {
	return m.getByIDFn(ctx, id)
}
func (m *mockRepo) Update(ctx context.Context, id string, params repository.UpdateCampaignParams) (model.Campaign, error) {
	return m.updateFn(ctx, id, params)
}
func (m *mockRepo) SoftDelete(ctx context.Context, id string) error {
	return m.softDeleteFn(ctx, id)
}
func (m *mockRepo) DeductBudget(ctx context.Context, id string) (int, error) {
	return m.deductBudgetFn(ctx, id)
}
func (m *mockRepo) GetStats(ctx context.Context, id string) (repository.Stats, error) {
	return m.getStatsFn(ctx, id)
}

func (m *mockRepo) MarkExpiredCampaigns(ctx context.Context) error {
	return nil
}

func TestRecordImpression_Concurrent(t *testing.T) {
	const budget = 50
	const goroutines = 100

	var counter atomic.Int64

	mock := &mockRepo{
		deductBudgetFn: func(ctx context.Context, id string) (int, error) {
			n := counter.Add(1)
			if n > budget {
				return 0, repository.ErrBudgetExhausted
			}
			return int(budget - n), nil
		},
	}

	svc := service.NewCampaignService(mock)

	var wg sync.WaitGroup
	var successes, exhausted atomic.Int64

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := svc.RecordImpression(context.Background(), "test-id")
			if err == nil {
				successes.Add(1)
			} else if errors.Is(err, repository.ErrBudgetExhausted) {
				exhausted.Add(1)
			}
		}()
	}
	wg.Wait()

	if got := successes.Load(); got != budget {
		t.Errorf("successes: got %d, want %d", got, budget)
	}
	if got := exhausted.Load(); got != goroutines-budget {
		t.Errorf("exhausted: got %d, want %d", got, goroutines-budget)
	}
	if total := successes.Load() + exhausted.Load(); total != goroutines {
		t.Errorf("unexpected errors: total accounted for %d of %d goroutines", total, goroutines)
	}
}

func TestCreateCampaign_Success(t *testing.T) {
	want := model.Campaign{
		ID:     "abc-123",
		Title:  "Test Campaign",
		Budget: 100,
		Status: model.StatusActive,
	}

	mock := &mockRepo{
		createFn: func(ctx context.Context, c model.Campaign) (model.Campaign, error) {
			return want, nil
		},
	}

	svc := service.NewCampaignService(mock)
	got, err := svc.CreateCampaign(context.Background(), model.Campaign{
		Title:  "Test Campaign",
		Budget: 100,
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != want.ID {
		t.Errorf("ID: got %q, want %q", got.ID, want.ID)
	}
	if got.Title != want.Title {
		t.Errorf("Title: got %q, want %q", got.Title, want.Title)
	}
	if got.Budget != want.Budget {
		t.Errorf("Budget: got %d, want %d", got.Budget, want.Budget)
	}
	if got.Status != want.Status {
		t.Errorf("Status: got %q, want %q", got.Status, want.Status)
	}
}

func TestSoftDelete_NotFoundInList(t *testing.T) {
	mock := &mockRepo{
		softDeleteFn: func(ctx context.Context, id string) error {
			return nil
		},
		listFn: func(ctx context.Context, statusFilter string) ([]model.Campaign, error) {
			return []model.Campaign{}, nil
		},
	}

	svc := service.NewCampaignService(mock)

	if err := svc.DeleteCampaign(context.Background(), "test-id"); err != nil {
		t.Fatalf("DeleteCampaign unexpected error: %v", err)
	}

	campaigns, err := svc.ListCampaigns(context.Background(), "")
	if err != nil {
		t.Fatalf("ListCampaigns unexpected error: %v", err)
	}
	if len(campaigns) != 0 {
		t.Errorf("expected empty list, got %d campaigns", len(campaigns))
	}
}
