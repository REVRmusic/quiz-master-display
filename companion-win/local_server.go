package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type LocalHub struct {
	mu      sync.Mutex
	clients map[*websocket.Conn]bool
	engine  *DmxEngine
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow localhost & deployed Cloudflare Pages/Workers origin
	},
}

func NewLocalHub(engine *DmxEngine) *LocalHub {
	return &LocalHub{
		clients: make(map[*websocket.Conn]bool),
		engine:  engine,
	}
}

func (h *LocalHub) BroadcastStatus(snap StatusSnapshot) {
	payload, err := json.Marshal(map[string]interface{}{
		"type": "STATUS",
		"data": snap,
	})
	if err != nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	for conn := range h.clients {
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			_ = conn.Close()
			delete(h.clients, conn)
		}
	}
}

func (h *LocalHub) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	h.mu.Lock()
	h.clients[conn] = true
	h.mu.Unlock()

	// Send initial status immediately
	snap := h.engine.GetSnapshot()
	if data, err := json.Marshal(map[string]interface{}{
		"type": "STATUS",
		"data": snap,
	}); err == nil {
		_ = conn.WriteMessage(websocket.TextMessage, data)
	}

	defer func() {
		h.mu.Lock()
		delete(h.clients, conn)
		h.mu.Unlock()
		_ = conn.Close()
	}()

	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			return
		}
		var cmd struct {
			Type  string     `json:"type"`
			Key   string     `json:"key"`
			Label string     `json:"label"`
			State *QuizState `json:"state"`
		}
		if err := json.Unmarshal(msgBytes, &cmd); err != nil {
			continue
		}

		switch cmd.Type {
		case "TEST_KEY":
			if cmd.Key != "" {
				go h.engine.SendManualTest(cmd.Key, cmd.Label)
			}
		case "RESYNC_ALL":
			go h.engine.ResyncAll()
		case "STATE_FALLBACK":
			// Only used if browser is online/active and companion Supabase WS is down
			if cmd.State != nil && !h.engine.GetSnapshot().SupabaseConnected {
				go h.engine.ProcessRemoteUpdate(cmd.State, nil)
			}
		case "PING":
			snap := h.engine.GetSnapshot()
			if data, err := json.Marshal(map[string]interface{}{
				"type": "STATUS",
				"data": snap,
			}); err == nil {
				_ = conn.WriteMessage(websocket.TextMessage, data)
			}
		}
	}
}

func (h *LocalHub) Start(port int) {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", h.handleWS)
	mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(h.engine.GetSnapshot())
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		snap := h.engine.GetSnapshot()
		fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="2">
<title>QuizMaster DMX Companion</title>
<style>body{font-family:system-ui,sans-serif;background:#090d16;color:#f8fafc;padding:2rem;max-width:720px;margin:auto}
.card{background:#111827;border:1px solid #1f2937;border-radius:16px;padding:1.5rem;margin-bottom:1rem}
.ok{color:#34d399;font-weight:700}.warn{color:#fbbf24;font-weight:700}code{background:#1f2937;padding:2px 6px;border-radius:6px}</style>
</head><body>
<h1>💡 QuizMaster DMX Companion (v%s)</h1>
<div class="card">
<p>Supabase Cloud : <span class="%s">%v</span></p>
<p>Fenêtre Sunlite détectée : <code>%s</code></p>
<p>Fenêtre active actuelle : <code>%s</code></p>
</div>
<div class="card"><h3>Derniers événements</h3><ul>`,
			snap.Version,
			map[bool]string{true: "ok", false: "warn"}[snap.SupabaseConnected],
			map[bool]string{true: "CONNECTÉ ✓", false: "RECONNEXION..."}[snap.SupabaseConnected],
			snap.SunliteWindow,
			snap.ActiveWindow,
		)
		for i := len(snap.Logs) - 1; i >= 0; i-- {
			l := snap.Logs[i]
			fmt.Fprintf(w, "<li><code>%s</code> [%s] %s</li>", l.Time, l.Level, l.Message)
		}
		fmt.Fprint(w, `</ul></div></body></html>`)
	})

	addr := fmt.Sprintf("127.0.0.1:%d", port)
	go func() {
		if err := http.ListenAndServe(addr, mux); err != nil {
			h.engine.Log("error", fmt.Sprintf("Port local %d indisponible: %v", port, err))
		}
	}()
}
