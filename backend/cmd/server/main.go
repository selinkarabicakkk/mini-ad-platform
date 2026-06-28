package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/handler"
	appmiddleware "github.com/selinkarabicakkk/mini-ad-platform/backend/internal/middleware"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/repository"
	"github.com/selinkarabicakkk/mini-ad-platform/backend/internal/service"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("failed to create connection pool: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	log.Println("connected to database")

	repo := repository.NewPostgresRepo(pool)
	svc := service.NewCampaignService(repo)
	h := handler.NewCampaignHandler(svc)

	limiter := appmiddleware.NewRateLimiter(10, time.Second)

	expireCtx, expireCancel := context.WithCancel(context.Background())
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := svc.MarkExpiredCampaigns(expireCtx); err != nil {
					log.Printf("mark expired campaigns: %v", err)
				}
			case <-expireCtx.Done():
				return
			}
		}
	}()

	r := chi.NewRouter()
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	r.Route("/api", func(r chi.Router) {
		h.RegisterRoutes(r, limiter.Middleware)
	})

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		log.Printf("server listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	log.Println("shutting down server...")
	expireCancel()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("shutdown error: %v", err)
	}
	pool.Close()
	log.Println("server stopped")
}
