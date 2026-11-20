package main

import (
	"testing"
)

func TestComputePlayerColor(t *testing.T) {
	cases := []struct {
		name        string
		player      Player
		winScore    int
		answeringId string
		want        string
	}{
		{"0 points active is green", Player{ID: "p1", Score: 0, Status: "active"}, 3, "", "green"},
		{"1 point active is green", Player{ID: "p1", Score: 1, Status: "active"}, 3, "", "green"},
		{"2 points active is green", Player{ID: "p1", Score: 2, Status: "active"}, 3, "", "green"},
		{"3 points active is yellow", Player{ID: "p1", Score: 3, Status: "active"}, 3, "", "yellow"},
		{"manual winner is yellow", Player{ID: "p1", Score: 0, Status: "winner"}, 3, "", "yellow"},
		{"answering player is blue", Player{ID: "p1", Score: 0, Status: "active"}, 3, "p1", "blue"},
		{"answering with 1 pt is blue", Player{ID: "p1", Score: 1, Status: "active"}, 3, "p1", "blue"},
		{"eliminated is red even if answering", Player{ID: "p1", Score: 3, Status: "eliminated"}, 3, "p1", "red"},
		{"eliminated with 0 pts is red", Player{ID: "p1", Score: 0, Status: "eliminated"}, 3, "", "red"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := computePlayerColor(tc.player, tc.winScore, tc.answeringId)
			if got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestEngineStateDiffing(t *testing.T) {
	eng := NewDmxEngine(nil)
	cfg := DefaultDmxConfig()

	state := &QuizState{
		WinScore:    3,
		DisplayMode: "scoreboard",
		DmxConfig:   &cfg,
		Players: []Player{
			{ID: "p1", Name: "Joueur 1", Score: 0, Status: "active"},
			{ID: "p2", Name: "Joueur 2", Score: 0, Status: "active"},
			{ID: "p3", Name: "Joueur 3", Score: 0, Status: "active"},
			{ID: "p4", Name: "Joueur 4", Score: 0, Status: "active"},
		},
	}

	// Initialisation: all players start green
	eng.ProcessRemoteUpdate(state, nil)
	snap := eng.GetSnapshot()
	for i := 0; i < 4; i++ {
		if snap.PlayerColors[i] != "green" {
			t.Fatalf("player %d expected green (default), got %s", i, snap.PlayerColors[i])
		}
	}

	// Player 1 buzzes in -> becomes blue
	p1Id := "p1"
	state.AnsweringPlayerId = &p1Id
	eng.ProcessRemoteUpdate(state, nil)
	snap = eng.GetSnapshot()
	if snap.PlayerColors[0] != "blue" {
		t.Fatalf("player 0 expected blue (answering), got %s", snap.PlayerColors[0])
	}

	// Player 1 scores 1 point (good answer) -> returns to green, Player 4 eliminated -> red
	state.AnsweringPlayerId = nil
	state.Players[0].Score = 1
	state.Players[3].Status = "eliminated"
	eng.ProcessRemoteUpdate(state, nil)

	snap = eng.GetSnapshot()
	if snap.PlayerColors[0] != "green" {
		t.Fatalf("player 0 expected green (returned to wait after point), got %s", snap.PlayerColors[0])
	}
	if snap.PlayerColors[1] != "green" || snap.PlayerColors[2] != "green" {
		t.Fatalf("players 1 & 2 expected green")
	}
	if snap.PlayerColors[3] != "red" {
		t.Fatalf("player 3 expected red (eliminated), got %s", snap.PlayerColors[3])
	}

	// Player 1 reaches 3 points -> becomes yellow
	state.Players[0].Score = 3
	eng.ProcessRemoteUpdate(state, nil)
	snap = eng.GetSnapshot()
	if snap.PlayerColors[0] != "yellow" {
		t.Fatalf("player 0 expected yellow (reached 3 pts), got %s", snap.PlayerColors[0])
	}

	// New round: scores reset to 0, statuses reset to active -> all return to green
	state.Players[0].Score = 0
	state.Players[3].Status = "active"
	eng.ProcessRemoteUpdate(state, nil)
	snap = eng.GetSnapshot()
	for i := 0; i < 4; i++ {
		if snap.PlayerColors[i] != "green" {
			t.Fatalf("new round: player %d expected green, got %s", i, snap.PlayerColors[i])
		}
	}
}

func TestLegacyConfigAutoMigration(t *testing.T) {
	eng := NewDmxEngine(nil)

	// Legacy config from previous version with old keys
	legacyCfg := DmxConfig{
		Enabled: true,
		PlayerMappings: []DmxPlayerMapping{
			{Green: "A", Blue: "Z", Yellow: "W", Red: "E"},
			{Green: "R", Blue: "T", Yellow: "U", Red: "Y"},
			{Green: "Q", Blue: "S", Yellow: "X", Red: "D"},
			{Green: "F", Blue: "G", Yellow: "V", Red: "H"},
			{Green: "J", Blue: "K", Yellow: "B", Red: "L"},
			{Green: "M", Blue: "O", Yellow: "P", Red: "N"},
		},
	}

	state := &QuizState{
		WinScore:    3,
		DisplayMode: "scoreboard",
		DmxConfig:   &legacyCfg,
		Players: []Player{
			{ID: "p1", Name: "Joueur 1", Score: 0, Status: "active"},
			{ID: "p2", Name: "Joueur 2", Score: 0, Status: "active"},
			{ID: "p3", Name: "Joueur 3", Score: 0, Status: "active"},
			{ID: "p4", Name: "Joueur 4", Score: 0, Status: "active"},
		},
	}

	cfg := eng.resolveConfig(state)
	// Joueur 1: Green: Z, Blue: W, Yellow: A, Red: E
	if cfg.PlayerMappings[0].Green != "Z" || cfg.PlayerMappings[0].Blue != "W" || cfg.PlayerMappings[0].Yellow != "A" || cfg.PlayerMappings[0].Red != "E" {
		t.Fatalf("expected P1 auto-migrated to Z/W/A/E, got %+v", cfg.PlayerMappings[0])
	}
	// Joueur 2: Green: T, Blue: U, Yellow: R, Red: Y
	if cfg.PlayerMappings[1].Green != "T" || cfg.PlayerMappings[1].Blue != "U" || cfg.PlayerMappings[1].Yellow != "R" || cfg.PlayerMappings[1].Red != "Y" {
		t.Fatalf("expected P2 auto-migrated to T/U/R/Y, got %+v", cfg.PlayerMappings[1])
	}
	// Joueur 3: Green: S, Blue: X, Yellow: Q, Red: D
	if cfg.PlayerMappings[2].Green != "S" || cfg.PlayerMappings[2].Blue != "X" || cfg.PlayerMappings[2].Yellow != "Q" || cfg.PlayerMappings[2].Red != "D" {
		t.Fatalf("expected P3 auto-migrated to S/X/Q/D, got %+v", cfg.PlayerMappings[2])
	}
	// Joueur 4: Green: G, Blue: V, Yellow: F, Red: H
	if cfg.PlayerMappings[3].Green != "G" || cfg.PlayerMappings[3].Blue != "V" || cfg.PlayerMappings[3].Yellow != "F" || cfg.PlayerMappings[3].Red != "H" {
		t.Fatalf("expected P4 auto-migrated to G/V/F/H, got %+v", cfg.PlayerMappings[3])
	}
}
