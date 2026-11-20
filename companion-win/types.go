package main

import "encoding/json"

type Player struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Score      int    `json:"score"`
	Status     string `json:"status"` // "active" | "eliminated" | "winner"
	ColorIndex int    `json:"colorIndex"`
}

type DmxPlayerMapping struct {
	Green  string `json:"green"`
	Blue   string `json:"blue"`
	Yellow string `json:"yellow"`
	Red    string `json:"red"`
}

type DmxConfig struct {
	Enabled              bool               `json:"enabled"`
	RequireSunliteFocus  bool               `json:"requireSunliteFocus"`
	AutoFocusSunlite     bool               `json:"autoFocusSunlite"`
	RequireDaslightFocus bool               `json:"requireDaslightFocus"`
	AutoFocusDaslight    bool               `json:"autoFocusDaslight"`
	DelayMs              int                `json:"delayMs"`
	PlayerMappings       []DmxPlayerMapping `json:"playerMappings"`
	IntermissionKey      string             `json:"intermissionKey"`
	VictoryFlashKey      string             `json:"victoryFlashKey"`
}

type QuizState struct {
	EventTitle        string     `json:"eventTitle"`
	Players           []Player   `json:"players"`
	WinScore          int        `json:"winScore"`
	DisplayMode       string     `json:"displayMode"` // "scoreboard" | "intermission" | "winner"
	CurrentRound      int        `json:"currentRound"`
	AnsweringPlayerId *string    `json:"answeringPlayerId"` // Player who buzzed first and has the floor
	LastUpdated       int64      `json:"lastUpdated"`
	DmxConfig         *DmxConfig `json:"dmxConfig"`
}

type SyncAction struct {
	Type       string          `json:"type"`
	Payload    json.RawMessage `json:"payload,omitempty"`
	ActionTime int64           `json:"_action_time,omitempty"`
}

type DmxTestPayload struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

type LogEntry struct {
	Time    string `json:"time"`
	Level   string `json:"level"` // "info" | "key" | "warn" | "error"
	Message string `json:"message"`
}

type StatusSnapshot struct {
	SupabaseConnected bool              `json:"supabaseConnected"`
	DaslightWindow    string            `json:"daslightWindow"`
	SunliteWindow     string            `json:"sunliteWindow"` // backward compat
	ActiveWindow      string            `json:"activeWindow"`
	PlayerColors      map[int]string    `json:"playerColors"`
	PlayerNames       map[int]string    `json:"playerNames"`
	DmxEnabled        bool              `json:"dmxEnabled"`
	DisplayMode       string            `json:"displayMode"`
	Logs              []LogEntry        `json:"logs"`
	Version           string            `json:"version"`
}
