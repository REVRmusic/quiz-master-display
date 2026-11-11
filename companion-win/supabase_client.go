package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	SupabaseHost       = "ncaahysqlobecigoaqna.supabase.co"
	SupabasePublishKey = "sb_publishable_6hUUh-63_B0cHYjhSBF-pQ_NEBJaV8m"
	SessionsTable      = "sessions_quiz"
	SessionID          = "default"
)

type sessionRow struct {
	ID         string          `json:"id"`
	State      json.RawMessage `json:"state"`
	LastAction json.RawMessage `json:"last_action"`
	UpdatedAt  string          `json:"updated_at"`
}

func decodeRawState(raw json.RawMessage) *QuizState {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	var st QuizState
	if err := json.Unmarshal(raw, &st); err == nil && len(st.Players) > 0 {
		return &st
	}
	// Handle string-encoded JSON if ever serialized as string
	var str string
	if err := json.Unmarshal(raw, &str); err == nil && str != "" {
		if err := json.Unmarshal([]byte(str), &st); err == nil {
			return &st
		}
	}
	return nil
}

func decodeRawAction(raw json.RawMessage) *SyncAction {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	var act SyncAction
	if err := json.Unmarshal(raw, &act); err == nil && act.Type != "" {
		return &act
	}
	var str string
	if err := json.Unmarshal(raw, &str); err == nil && str != "" {
		if err := json.Unmarshal([]byte(str), &act); err == nil && act.Type != "" {
			return &act
		}
	}
	return nil
}

func FetchCurrentSession(engine *DmxEngine) error {
	url := fmt.Sprintf(
		"https://%s/rest/v1/%s?id=eq.%s&select=id,state,last_action,updated_at",
		SupabaseHost, SessionsTable, SessionID,
	)

	client := &http.Client{Timeout: 8 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", SupabasePublishKey)
	req.Header.Set("Authorization", "Bearer "+SupabasePublishKey)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var rows []sessionRow
	if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil {
		return err
	}

	if len(rows) > 0 {
		st := decodeRawState(rows[0].State)
		act := decodeRawAction(rows[0].LastAction)
		if st != nil {
			engine.ProcessRemoteUpdate(st, act)
		}
	}
	return nil
}

type phoenixMsg struct {
	Topic   string          `json:"topic"`
	Event   string          `json:"event"`
	Payload json.RawMessage `json:"payload"`
	Ref     *string         `json:"ref"`
}

func StartSupabaseRealtimeLoop(engine *DmxEngine, stopCh <-chan struct{}) {
	// Initial fetch right on startup
	if err := FetchCurrentSession(engine); err != nil {
		engine.Log("warn", fmt.Sprintf("Lecture initiale REST échouée : %v", err))
	}

	wsURL := fmt.Sprintf(
		"wss://%s/realtime/v1/websocket?apikey=%s&vsn=1.0.0",
		SupabaseHost, SupabasePublishKey,
	)

	for {
		select {
		case <-stopCh:
			return
		default:
		}

		err := runSingleWsSession(wsURL, engine, stopCh)
		engine.SetSupabaseConnected(false)
		if err != nil {
			engine.Log("warn", fmt.Sprintf("WebSocket Supabase déconnecté (%v), nouvelle tentative dans 3s...", err))
		}

		// Fallback REST fetch while reconnecting
		select {
		case <-stopCh:
			return
		case <-time.After(3 * time.Second):
			_ = FetchCurrentSession(engine)
		}
	}
}

func runSingleWsSession(wsURL string, engine *DmxEngine, stopCh <-chan struct{}) error {
	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.Dial(wsURL, nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	var writeMu sync.Mutex
	sendJSON := func(v interface{}) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		return conn.WriteJSON(v)
	}

	joinPayload := map[string]interface{}{
		"topic": fmt.Sprintf("realtime:public:%s", SessionsTable),
		"event": "phx_join",
		"payload": map[string]interface{}{
			"config": map[string]interface{}{
				"postgres_changes": []map[string]interface{}{
					{
						"event":  "*",
						"schema": "public",
						"table":  SessionsTable,
						"filter": fmt.Sprintf("id=eq.%s", SessionID),
					},
				},
			},
		},
		"ref": "1",
	}

	if err := sendJSON(joinPayload); err != nil {
		return err
	}

	done := make(chan struct{})
	defer close(done)

	// Heartbeat goroutine (every 25 seconds)
	go func() {
		ticker := time.NewTicker(25 * time.Second)
		defer ticker.Stop()
		hbCounter := 1
		for {
			select {
			case <-done:
				return
			case <-stopCh:
				return
			case <-ticker.C:
				hbCounter++
				hb := map[string]interface{}{
					"topic":   "phoenix",
					"event":   "heartbeat",
					"payload": map[string]interface{}{},
					"ref":     fmt.Sprintf("hb-%d", hbCounter),
				}
				if err := sendJSON(hb); err != nil {
					return
				}
			}
		}
	}()

	// Watch stopCh to close connection cleanly
	go func() {
		select {
		case <-stopCh:
			_ = conn.Close()
		case <-done:
		}
	}()

	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			return err
		}

		var msg phoenixMsg
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			continue
		}

		switch msg.Event {
		case "system":
			var sysPayload struct {
				Status string `json:"status"`
			}
			if err := json.Unmarshal(msg.Payload, &sysPayload); err == nil && sysPayload.Status == "ok" {
				engine.SetSupabaseConnected(true)
			}
		case "postgres_changes":
			var pgPayload struct {
				Data struct {
					Type   string     `json:"type"`
					Record sessionRow `json:"record"`
				} `json:"data"`
			}
			if err := json.Unmarshal(msg.Payload, &pgPayload); err == nil {
				st := decodeRawState(pgPayload.Data.Record.State)
				act := decodeRawAction(pgPayload.Data.Record.LastAction)
				if st != nil {
					engine.ProcessRemoteUpdate(st, act)
				}
			}
		}
	}
}
