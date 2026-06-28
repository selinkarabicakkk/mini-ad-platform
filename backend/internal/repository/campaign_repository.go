package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/model"
)

var ErrBudgetExhausted = errors.New("budget exhausted")

type Stats struct {
	TotalImpressions int
	SpentBudget      int
	RemainingBudget  int
}

type UpdateCampaignParams struct {
	Title     *string
	Budget    *int
	StartDate *time.Time
	EndDate   *time.Time
	Status    *model.CampaignStatus
}

type CampaignRepository interface {
	Create(ctx context.Context, c model.Campaign) (model.Campaign, error)
	List(ctx context.Context, statusFilter string) ([]model.Campaign, error)
	GetByID(ctx context.Context, id string) (model.Campaign, error)
	Update(ctx context.Context, id string, params UpdateCampaignParams) (model.Campaign, error)
	SoftDelete(ctx context.Context, id string) error
	DeductBudget(ctx context.Context, id string) (remainingBudget int, err error)
	GetStats(ctx context.Context, id string) (Stats, error)
}

type postgresRepo struct {
	pool *pgxpool.Pool
}

func NewPostgresRepo(pool *pgxpool.Pool) CampaignRepository {
	return &postgresRepo{pool: pool}
}

const selectColumns = `id, title, budget, initial_budget, start_date, end_date, status, created_at, updated_at, deleted_at`

func scanCampaign(row pgx.Row) (model.Campaign, error) {
	var c model.Campaign
	err := row.Scan(
		&c.ID, &c.Title, &c.Budget, &c.InitialBudget,
		&c.StartDate, &c.EndDate, &c.Status,
		&c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
	)
	return c, err
}

func (r *postgresRepo) Create(ctx context.Context, c model.Campaign) (model.Campaign, error) {
	query := fmt.Sprintf(`
		INSERT INTO campaigns (title, budget, initial_budget, start_date, end_date, status)
		VALUES ($1, $2, $2, $3, $4, $5)
		RETURNING %s`, selectColumns)

	row := r.pool.QueryRow(ctx, query, c.Title, c.Budget, c.StartDate, c.EndDate, c.Status)
	return scanCampaign(row)
}

func (r *postgresRepo) List(ctx context.Context, statusFilter string) ([]model.Campaign, error) {
	query := fmt.Sprintf(`SELECT %s FROM campaigns WHERE deleted_at IS NULL`, selectColumns)
	args := []any{}

	if statusFilter != "" {
		query += ` AND status = $1`
		args = append(args, statusFilter)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var campaigns []model.Campaign
	for rows.Next() {
		var c model.Campaign
		if err := rows.Scan(
			&c.ID, &c.Title, &c.Budget, &c.InitialBudget,
			&c.StartDate, &c.EndDate, &c.Status,
			&c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
		); err != nil {
			return nil, err
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, rows.Err()
}

func (r *postgresRepo) GetByID(ctx context.Context, id string) (model.Campaign, error) {
	query := fmt.Sprintf(`SELECT %s FROM campaigns WHERE id = $1 AND deleted_at IS NULL`, selectColumns)
	row := r.pool.QueryRow(ctx, query, id)
	return scanCampaign(row)
}

func (r *postgresRepo) Update(ctx context.Context, id string, params UpdateCampaignParams) (model.Campaign, error) {
	setClauses := []string{"updated_at = now()"}
	args := []any{}
	n := 1

	if params.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", n))
		args = append(args, *params.Title)
		n++
	}
	if params.Budget != nil {
		setClauses = append(setClauses, fmt.Sprintf("budget = $%d", n))
		args = append(args, *params.Budget)
		n++
	}
	if params.StartDate != nil {
		setClauses = append(setClauses, fmt.Sprintf("start_date = $%d", n))
		args = append(args, *params.StartDate)
		n++
	}
	if params.EndDate != nil {
		setClauses = append(setClauses, fmt.Sprintf("end_date = $%d", n))
		args = append(args, *params.EndDate)
		n++
	}
	if params.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", n))
		args = append(args, *params.Status)
		n++
	}

	args = append(args, id)
	query := fmt.Sprintf(
		`UPDATE campaigns SET %s WHERE id = $%d AND deleted_at IS NULL RETURNING %s`,
		strings.Join(setClauses, ", "), n, selectColumns,
	)

	row := r.pool.QueryRow(ctx, query, args...)
	return scanCampaign(row)
}

func (r *postgresRepo) SoftDelete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE campaigns SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *postgresRepo) DeductBudget(ctx context.Context, id string) (int, error) {
	var remainingBudget int
	var ignoredID string
	var ignoredStatus model.CampaignStatus

	err := r.pool.QueryRow(ctx, `
		UPDATE campaigns
		SET budget = budget - 1,
		    status = CASE WHEN budget - 1 <= 0 THEN 'paused' ELSE status END
		WHERE id = $1 AND budget > 0 AND deleted_at IS NULL
		RETURNING id, budget, status`, id,
	).Scan(&ignoredID, &remainingBudget, &ignoredStatus)

	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrBudgetExhausted
	}
	return remainingBudget, err
}

func (r *postgresRepo) GetStats(ctx context.Context, id string) (Stats, error) {
	var budget, initialBudget int
	err := r.pool.QueryRow(ctx,
		`SELECT budget, initial_budget FROM campaigns WHERE id = $1 AND deleted_at IS NULL`, id,
	).Scan(&budget, &initialBudget)
	if err != nil {
		return Stats{}, err
	}

	spent := initialBudget - budget
	return Stats{
		TotalImpressions: spent,
		SpentBudget:      spent,
		RemainingBudget:  budget,
	}, nil
}
