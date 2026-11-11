package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"
)

const AppVersion = "1.0.0"

type DmxEngine struct {
	mu                sync.Mutex
	currentState      *QuizState
	lastPlayerColors  map[int]string
	lastPlayerNames   map[int]string
	lastDisplayMode   string
	lastActionTime    int64
	startTimeMs       int64
	hasInitialized    bool
	supabaseConnected bool
	logs              []LogEntry
	onStatusChange    func(StatusSnapshot)
}

func NewDmxEngine(onStatusChange func(StatusSnapshot)) *DmxEngine {
	return &DmxEngine{
		lastPlayerColors: make(map[int]string),
		lastPlayerNames:  make(map[int]string),
		startTimeMs:      time.Now().UnixMilli(),
		logs:             make([]LogEntry, 0, 50),
		onStatusChange:   onStatusChange,
	}
}

func DefaultDmxConfig() DmxConfig {
	return DmxConfig{
		Enabled:             true,
		RequireSunliteFocus: false,
		AutoFocusSunlite:    true,
		DelayMs:             80,
		PlayerMappings: []DmxPlayerMapping{
			{Blue: "A", Green: "Z", Red: "E"},
			{Blue: "R", Green: "T", Red: "Y"},
			{Blue: "Q", Green: "S", Red: "D"},
			{Blue: "F", Green: "G", Red: "H"},
			{Blue: "W", Green: "X", Red: "C"},
			{Blue: "V", Green: "B", Red: "N"},
		},
	}
}

func (e *DmxEngine) resolveConfig(state *QuizState) DmxConfig {
	def := DefaultDmxConfig()
	if state == nil || state.DmxConfig == nil {
		return def
	}
	cfg := *state.DmxConfig
	if len(cfg.PlayerMappings) < 6 {
		merged := make([]DmxPlayerMapping, 6)
		for i := 0; i < 6; i++ {
			if i < len(cfg.PlayerMappings) {
				merged[i] = cfg.PlayerMappings[i]
			} else {
				merged[i] = def.PlayerMappings[i]
			}
		}
		cfg.PlayerMappings = merged
	}
	if cfg.DelayMs <= 0 {
		cfg.DelayMs = 80
	}
	return cfg
}

func computePlayerColor(p Player, winScore int) string {
	if p.Status == "eliminated" {
		return "red"
	}
	if p.Status == "winner" || (winScore > 0 && p.Score >= winScore) {
		return "green"
	}
	return "blue"
}

func colorLabelFr(c string) string {
	switch c {
	case "green":
		return "VERT"
	case "red":
		return "ROUGE"
	default:
		return "BLEU"
	}
}

func (e *DmxEngine) addLogLocked(level, msg string) {
	now := time.Now().Format("15:04:05")
	entry := LogEntry{
		Time:    now,
		Level:   level,
		Message: msg,
	}
	e.logs = append(e.logs, entry)
	if len(e.logs) > 40 {
		e.logs = e.logs[len(e.logs)-40:]
	}

	// Print nicely to Windows console
	var prefix string
	switch level {
	case "key":
		prefix = "\033[36m[DMX-KEY]\033[0m"
	case "warn":
		prefix = "\033[33m[WARN]\033[0m   "
	case "error":
		prefix = "\033[31m[ERR]\033[0m    "
	default:
		prefix = "\033[32m[INFO]\033[0m   "
	}
	fmt.Printf("%s %s %s\n", now, prefix, msg)
}

func (e *DmxEngine) Log(level, msg string) {
	e.mu.Lock()
	e.addLogLocked(level, msg)
	snap := e.snapshotLocked()
	e.mu.Unlock()
	if e.onStatusChange != nil {
		e.onStatusChange(snap)
	}
}

func (e *DmxEngine) SetSupabaseConnected(connected bool) {
	e.mu.Lock()
	changed := e.supabaseConnected != connected
	e.supabaseConnected = connected
	if changed {
		if connected {
			e.addLogLocked("info", "Connecté à Supabase Realtime (prêt à recevoir les scores)")
		} else {
			e.addLogLocked("warn", "Connexion Supabase interrompue (reconnexion automatique...)")
		}
	}
	snap := e.snapshotLocked()
	e.mu.Unlock()

	if changed && e.onStatusChange != nil {
		e.onStatusChange(snap)
	}
}

func (e *DmxEngine) snapshotLocked() StatusSnapshot {
	_, sunliteTitle := FindSunliteWindow()
	activeTitle := GetActiveWindowTitle()

	colorsCopy := make(map[int]string, len(e.lastPlayerColors))
	for k, v := range e.lastPlayerColors {
		colorsCopy[k] = v
	}
	namesCopy := make(map[int]string, len(e.lastPlayerNames))
	for k, v := range e.lastPlayerNames {
		namesCopy[k] = v
	}
	logsCopy := make([]LogEntry, len(e.logs))
	copy(logsCopy, e.logs)

	dmxEnabled := true
	if e.currentState != nil && e.currentState.DmxConfig != nil {
		dmxEnabled = e.currentState.DmxConfig.Enabled
	}

	return StatusSnapshot{
		SupabaseConnected: e.supabaseConnected,
		SunliteWindow:     sunliteTitle,
		ActiveWindow:      activeTitle,
		PlayerColors:      colorsCopy,
		PlayerNames:       namesCopy,
		DmxEnabled:        dmxEnabled,
		DisplayMode:       e.lastDisplayMode,
		Logs:              logsCopy,
		Version:           AppVersion,
	}
}

func (e *DmxEngine) GetSnapshot() StatusSnapshot {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.snapshotLocked()
}

type queuedKey struct {
	shortcut string
	desc     string
}

func (e *DmxEngine) ProcessRemoteUpdate(state *QuizState, action *SyncAction) {
	if state == nil {
		return
	}

	var keysToSend []queuedKey
	var cfg DmxConfig

	e.mu.Lock()
	e.currentState = state
	cfg = e.resolveConfig(state)

	isFirstInit := !e.hasInitialized
	e.hasInitialized = true

	// Check player color transitions
	for i, p := range state.Players {
		if i >= len(cfg.PlayerMappings) {
			break
		}
		color := computePlayerColor(p, state.WinScore)
		prevColor, existed := e.lastPlayerColors[i]
		e.lastPlayerNames[i] = p.Name

		// Send shortcut on first init or whenever color changes (or returning from intermission)
		returningFromIntermission := e.lastDisplayMode == "intermission" && state.DisplayMode != "intermission"
		if !existed || prevColor != color || returningFromIntermission {
			e.lastPlayerColors[i] = color
			if cfg.Enabled && state.DisplayMode != "intermission" {
				shortcut := shortcutForColor(cfg.PlayerMappings[i], color)
				if shortcut != "" {
					tag := "Changement"
					if isFirstInit {
						tag = "Initialisation"
					} else if returningFromIntermission {
						tag = "Reprise jeu"
					}
					keysToSend = append(keysToSend, queuedKey{
						shortcut: shortcut,
						desc:     fmt.Sprintf("%s → %s (%s) : [%s]", tag, p.Name, colorLabelFr(color), shortcut),
					})
				}
			}
		}
	}

	// Trim removed players if player count decreased
	for idx := range e.lastPlayerColors {
		if idx >= len(state.Players) {
			delete(e.lastPlayerColors, idx)
			delete(e.lastPlayerNames, idx)
		}
	}

	// Check Intermission mode transition
	if state.DisplayMode != e.lastDisplayMode {
		prevMode := e.lastDisplayMode
		e.lastDisplayMode = state.DisplayMode
		if cfg.Enabled && state.DisplayMode == "intermission" && prevMode != "" && strings.TrimSpace(cfg.IntermissionKey) != "" {
			keysToSend = append(keysToSend, queuedKey{
				shortcut: cfg.IntermissionKey,
				desc:     fmt.Sprintf("Mode Pause / Attente : [%s]", cfg.IntermissionKey),
			})
		}
	}

	// Check explicit actions (only if triggered AFTER app started, to avoid firing stale actions on boot)
	if action != nil && action.ActionTime > e.startTimeMs && action.ActionTime > e.lastActionTime {
		e.lastActionTime = action.ActionTime
		switch action.Type {
		case "DMX_TEST":
			var p DmxTestPayload
			if err := json.Unmarshal(action.Payload, &p); err == nil && strings.TrimSpace(p.Key) != "" {
				label := p.Label
				if label == "" {
					label = "Test manuel"
				}
				keysToSend = append(keysToSend, queuedKey{
					shortcut: p.Key,
					desc:     fmt.Sprintf("%s : [%s]", label, p.Key),
				})
			}
		case "DMX_RESYNC":
			if cfg.Enabled {
				keysToSend = e.buildFullResyncLocked(state, cfg)
			}
		case "TRIGGER_CONFETTI":
			if cfg.Enabled && strings.TrimSpace(cfg.VictoryFlashKey) != "" {
				keysToSend = append(keysToSend, queuedKey{
					shortcut: cfg.VictoryFlashKey,
					desc:     fmt.Sprintf("Effet Victoire / Confettis : [%s]", cfg.VictoryFlashKey),
				})
			}
		}
	}

	snap := e.snapshotLocked()
	e.mu.Unlock()

	if e.onStatusChange != nil {
		e.onStatusChange(snap)
	}

	if len(keysToSend) > 0 {
		e.dispatchKeys(keysToSend, cfg)
	}
}

func (e *DmxEngine) buildFullResyncLocked(state *QuizState, cfg DmxConfig) []queuedKey {
	var keys []queuedKey
	for i, p := range state.Players {
		if i >= len(cfg.PlayerMappings) {
			break
		}
		color := computePlayerColor(p, state.WinScore)
		e.lastPlayerColors[i] = color
		shortcut := shortcutForColor(cfg.PlayerMappings[i], color)
		if shortcut != "" {
			keys = append(keys, queuedKey{
				shortcut: shortcut,
				desc:     fmt.Sprintf("Resync → %s (%s) : [%s]", p.Name, colorLabelFr(color), shortcut),
			})
		}
	}
	return keys
}

// ResyncAll forces re-sending every active player's current LED color shortcut
func (e *DmxEngine) ResyncAll() {
	e.mu.Lock()
	state := e.currentState
	if state == nil {
		e.addLogLocked("warn", "Aucun état reçu pour le moment, impossible de resynchroniser")
		snap := e.snapshotLocked()
		e.mu.Unlock()
		if e.onStatusChange != nil {
			e.onStatusChange(snap)
		}
		return
	}
	cfg := e.resolveConfig(state)
	keys := e.buildFullResyncLocked(state, cfg)
	e.mu.Unlock()

	e.dispatchKeys(keys, cfg)
}

// SendManualTest sends a single test keystroke using current focus settings
func (e *DmxEngine) SendManualTest(shortcut string, label string) {
	e.mu.Lock()
	cfg := e.resolveConfig(e.currentState)
	e.mu.Unlock()

	if label == "" {
		label = "Test touche"
	}
	e.dispatchKeys([]queuedKey{{
		shortcut: shortcut,
		desc:     fmt.Sprintf("%s : [%s]", label, shortcut),
	}}, cfg)
}

func (e *DmxEngine) dispatchKeys(keys []queuedKey, cfg DmxConfig) {
	delay := time.Duration(cfg.DelayMs) * time.Millisecond
	if delay < 30*time.Millisecond {
		delay = 30 * time.Millisecond
	}

	for idx, k := range keys {
		if idx > 0 {
			time.Sleep(delay)
		}
		err := SendShortcut(k.shortcut, cfg.AutoFocusSunlite, cfg.RequireSunliteFocus)
		if err != nil {
			e.Log("error", fmt.Sprintf("Échec envoi %s (%v)", k.desc, err))
		} else {
			e.Log("key", k.desc)
		}
	}
}

func shortcutForColor(m DmxPlayerMapping, color string) string {
	switch color {
	case "green":
		return strings.TrimSpace(m.Green)
	case "red":
		return strings.TrimSpace(m.Red)
	default:
		return strings.TrimSpace(m.Blue)
	}
}
