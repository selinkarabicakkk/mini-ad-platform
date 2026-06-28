package middleware

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type ipWindow struct {
	count   int
	resetAt time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	clients map[string]*ipWindow
	limit   int
	window  time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		clients: make(map[string]*ipWindow),
		limit:   limit,
		window:  window,
	}
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
			ip = realIP
		}

		rl.mu.Lock()
		entry, ok := rl.clients[ip]
		now := time.Now()
		if !ok || now.After(entry.resetAt) {
			rl.clients[ip] = &ipWindow{count: 1, resetAt: now.Add(rl.window)}
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}
		entry.count++
		if entry.count > rl.limit {
			rl.mu.Unlock()
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{"error": "rate limit exceeded"})
			return
		}
		rl.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}
