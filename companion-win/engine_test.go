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
		{"1 point active is blue", Player{ID: "p1", Score: 1, Status: "active"}, 3, "", "blue"},
		{"2 points active is blue", Player{ID: "p1", Score: 2, Status: "active"}, 3, "", "blue"},
		{"3 points active is blue", Player{ID: "p1", Score: 3, Status: "active"}, 3, "", "blue"},
		{"manual winner is blue", Player{ID: "p1", Score: 0, Status: "winner"}, 3, "", "blue"},
		{"answering player is yellow", Player{ID: "p1", Score: 0, Status: "active"}, 3, "p1", "yellow"},
		{"answering with points is yellow", Player{ID: "p1", Score: 2, Status: "active"}, 3, "p1", "yellow"},
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

	eng.ProcessRemoteUpdate(state, nil)
	snap := eng.GetSnapshot()
	for i := 0; i < 4; i++ {
		if snap.PlayerColors[i] != "green" {
			t.Fatalf("player %d expected green (default), got %s", i, snap.PlayerColors[i])
		}
	}

	// Player 1 buzzes in -> becomes yellow
	p1Id := "p1"
	state.AnsweringPlayerId = &p1Id
	eng.ProcessRemoteUpdate(state, nil)
	snap = eng.GetSnapshot()
	if snap.PlayerColors[0] != "yellow" {
		t.Fatalf("player 0 expected yellow (answering), got %s", snap.PlayerColors[0])
	}

	// Player 1 scores 1 point -> becomes blue, Player 4 eliminated -> red
	state.AnsweringPlayerId = nil
	state.Players[0].Score = 1
	state.Players[3].Status = "eliminated"
	eng.ProcessRemoteUpdate(state, nil)

	snap = eng.GetSnapshot()
	if snap.PlayerColors[0] != "blue" {
		t.Fatalf("player 0 expected blue (scored point), got %s", snap.PlayerColors[0])
	}
	if snap.PlayerColors[1] != "green" || snap.PlayerColors[2] != "green" {
		t.Fatalf("players 1 & 2 expected green")
	}
	if snap.PlayerColors[3] != "red" {
		t.Fatalf("player 3 expected red, got %s", snap.PlayerColors[3])
	}
}
