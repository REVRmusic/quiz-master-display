package main

import (
	"testing"
)

func TestComputePlayerColor(t *testing.T) {
	cases := []struct {
		name     string
		player   Player
		winScore int
		want     string
	}{
		{"0 points active is blue", Player{Score: 0, Status: "active"}, 3, "blue"},
		{"1 point active is blue", Player{Score: 1, Status: "active"}, 3, "blue"},
		{"2 points active is blue", Player{Score: 2, Status: "active"}, 3, "blue"},
		{"3 points active becomes green", Player{Score: 3, Status: "active"}, 3, "green"},
		{"manual winner is green", Player{Score: 1, Status: "winner"}, 3, "green"},
		{"eliminated is red even with 3 pts", Player{Score: 3, Status: "eliminated"}, 3, "red"},
		{"eliminated with 0 pts is red", Player{Score: 0, Status: "eliminated"}, 3, "red"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := computePlayerColor(tc.player, tc.winScore)
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

	eng.ProcessRemoteUpdate(state, nil)
	snap := eng.GetSnapshot()
	for i := 0; i < 4; i++ {
		if snap.PlayerColors[i] != "blue" {
			t.Fatalf("player %d expected blue, got %s", i, snap.PlayerColors[i])
		}
	}

	// Player 1 hits 3 points -> green, Player 4 eliminated -> red
	state.Players[0].Score = 3
	state.Players[0].Status = "winner"
	state.Players[3].Status = "eliminated"
	eng.ProcessRemoteUpdate(state, nil)

	snap = eng.GetSnapshot()
	if snap.PlayerColors[0] != "green" {
		t.Fatalf("player 0 expected green, got %s", snap.PlayerColors[0])
	}
	if snap.PlayerColors[1] != "blue" || snap.PlayerColors[2] != "blue" {
		t.Fatalf("players 1 & 2 expected blue")
	}
	if snap.PlayerColors[3] != "red" {
		t.Fatalf("player 3 expected red, got %s", snap.PlayerColors[3])
	}
}
