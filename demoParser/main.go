//go:build js && wasm
// +build js,wasm

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"syscall/js"

	dem "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs"
	common "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs/common"
	events "github.com/markus-wa/demoinfocs-golang/v4/pkg/demoinfocs/events"
)

const (
	msgQueueBufferSize = 128 * 1024
)

func main() {
	c := make(chan struct{}, 0)

	registerCallbacks()
	fmt.Println("WASM Demo Parser Initialized")
	<-c
}

func registerCallbacks() {
	js.Global().Set("parseDemo", js.FuncOf(parseDemo))
}

func uint8ArrayToBytes(value js.Value) []byte {
	s := make([]byte, value.Get("byteLength").Int())
	js.CopyBytesToGo(s, value)
	return s
}

func parseDemo(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return js.ValueOf(map[string]interface{}{
			"error": "Missing arguments: parseDemo(demoData, callback, options)",
		})
	}

	parseDemoInternal(args[0], args[1], args[2:])
	return nil
}

type ParseOptions struct {
	TickInterval int `json:"tickInterval"`
}

type PlayerPosition struct {
	Tick           int     `json:"tick"`
	SteamID        uint64  `json:"steamId"`
	Name           string  `json:"name"`
	Team           string  `json:"team"`
	Side           string  `json:"side"`
	X              float64 `json:"x"`
	Y              float64 `json:"y"`
	ViewX          float32 `json:"viewX"`
	ViewY          float32 `json:"viewY"`
	VelocityX      float64 `json:"velocityX"`
	VelocityY      float64 `json:"velocityY"`
	IsAlive        bool    `json:"isAlive"`
	Health         int     `json:"health"`
	Armor          int     `json:"armor"`
	HasHelmet      bool    `json:"hasHelmet"`
	HasDefuseKit   bool    `json:"hasDefuseKit"`
	Money          int     `json:"money"`
	EquipmentValue int     `json:"equipmentValue"`
	ActiveWeapon   string  `json:"activeWeapon"`
	IsScoped       bool    `json:"isScoped"`
	IsDucking      bool    `json:"isDucking"`
	IsWalking      bool    `json:"isWalking"`
}

type KillEvent struct {
	Tick              int     `json:"tick"`
	AttackerID        uint64  `json:"attackerId"`
	AttackerName      string  `json:"attackerName"`
	AttackerTeam      string  `json:"attackerTeam"`
	AttackerSide      string  `json:"attackerSide"`
	VictimID          uint64  `json:"victimId"`
	VictimName        string  `json:"victimName"`
	VictimTeam        string  `json:"victimTeam"`
	VictimSide        string  `json:"victimSide"`
	AssisterID        uint64  `json:"assisterId"`
	AssisterName      string  `json:"assisterName"`
	Weapon            string  `json:"weapon"`
	WeaponClass       string  `json:"weaponClass"`
	IsHeadshot        bool    `json:"isHeadshot"`
	IsWallbang        bool    `json:"isWallbang"`
	PenetratedObjects int     `json:"penetratedObjects"`
	IsFlashAssist     bool    `json:"isFlashAssist"`
	IsThroughSmoke    bool    `json:"isThroughSmoke"`
	AttackerX         float64 `json:"attackerX"`
	AttackerY         float64 `json:"attackerY"`
	VictimX           float64 `json:"victimX"`
	VictimY           float64 `json:"victimY"`
}

type DamageEvent struct {
	Tick        int    `json:"tick"`
	AttackerID  uint64 `json:"attackerId"`
	VictimID    uint64 `json:"victimId"`
	Weapon      string `json:"weapon"`
	WeaponClass string `json:"weaponClass"`
	Damage      int    `json:"damage"`
	DamageArmor int    `json:"damageArmor"`
	Health      int    `json:"health"`
	Armor       int    `json:"armor"`
	Hitgroup    string `json:"hitgroup"`
}

type WeaponFireEvent struct {
	Tick        int     `json:"tick"`
	ShooterID   uint64  `json:"shooterId"`
	ShooterName string  `json:"shooterName"`
	Weapon      string  `json:"weapon"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
}

type FlashEvent struct {
	Tick          int     `json:"tick"`
	AttackerID    uint64  `json:"attackerId"`
	AttackerName  string  `json:"attackerName"`
	VictimID      uint64  `json:"victimId"`
	VictimName    string  `json:"victimName"`
	FlashDuration float32 `json:"flashDuration"`
}

type GrenadeEvent struct {
	Tick        int     `json:"tick"`
	ThrowerID   uint64  `json:"throwerId"`
	ThrowerName string  `json:"throwerName"`
	ThrowerTeam string  `json:"throwerTeam"`
	ThrowerSide string  `json:"throwerSide"`
	GrenadeType string  `json:"grenadeType"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	EventType   string  `json:"eventType"` // thrown, detonate, expire
}

type SmokeEvent struct {
	Tick        int     `json:"tick"`
	ThrowerID   uint64  `json:"throwerId"`
	ThrowerName string  `json:"throwerName"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	EventType   string  `json:"eventType"` // start, expire
}

type BombEvent struct {
	Tick       int     `json:"tick"`
	Event      string  `json:"event"` // planted, defused, exploded, defuse_start, defuse_stop
	PlayerID   uint64  `json:"playerId"`
	PlayerName string  `json:"playerName"`
	Site       string  `json:"site"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
}

type RoundEvent struct {
	RoundNum          int    `json:"roundNum"`
	StartTick         int    `json:"startTick"`
	EndTick           int    `json:"endTick"`
	FreezeTimeEndTick int    `json:"freezeTimeEndTick"`
	Winner            string `json:"winner"`
	Reason            string `json:"reason"`
	CTScore           int    `json:"ctScore"`
	TScore            int    `json:"tScore"`
	WinnerSide        string `json:"winnerSide"`
	CTStartMoney      int    `json:"ctStartMoney"`
	TStartMoney       int    `json:"tStartMoney"`
	CTEquipmentValue  int    `json:"ctEquipmentValue"`
	TEquipmentValue   int    `json:"tEquipmentValue"`
	BombPlantTick     int    `json:"bombPlantTick"`
}

type PlayerStats struct {
	Name    string `json:"name"`
	SteamID uint64 `json:"steamId"`
	Team    string `json:"team"`
	Side    string `json:"side"`
	Kills   int    `json:"kills"`
	Deaths  int    `json:"deaths"`
	Assists int    `json:"assists"`
	MVPs    int    `json:"mvps"`
	Score   int    `json:"score"`
}

type ParseResult struct {
	Header      map[string]interface{} `json:"header"`
	Ticks       []PlayerPosition       `json:"ticks"`
	Kills       []KillEvent            `json:"kills"`
	Damages     []DamageEvent          `json:"damages"`
	WeaponFires []WeaponFireEvent      `json:"weaponFires"`
	Flashes     []FlashEvent           `json:"flashes"`
	Grenades    []GrenadeEvent         `json:"grenades"`
	Smokes      []SmokeEvent           `json:"smokes"`
	Bombs       []BombEvent            `json:"bombs"`
	Rounds      []RoundEvent           `json:"rounds"`
	Players     []PlayerStats          `json:"players"`
}

func teamToString(team common.Team) string {
	switch team {
	case common.TeamTerrorists:
		return "T"
	case common.TeamCounterTerrorists:
		return "CT"
	case common.TeamSpectators:
		return "SPEC"
	default:
		return "UNASSIGNED"
	}
}

func hitgroupToString(hg events.HitGroup) string {
	switch hg {
	case events.HitGroupHead:
		return "Head"
	case events.HitGroupChest:
		return "Chest"
	case events.HitGroupStomach:
		return "Stomach"
	case events.HitGroupLeftArm:
		return "LeftArm"
	case events.HitGroupRightArm:
		return "RightArm"
	case events.HitGroupLeftLeg:
		return "LeftLeg"
	case events.HitGroupRightLeg:
		return "RightLeg"
	case events.HitGroupGeneric:
		return "Generic"
	default:
		return "Unknown"
	}
}

func bombsiteToString(site events.Bombsite) string {
	switch site {
	case events.BombsiteA:
		return "A"
	case events.BombsiteB:
		return "B"
	default:
		return "Unknown"
	}
}

func equipmentClassToString(class common.EquipmentClass) string {
	switch class {
	case common.EqClassRifle:
		return "Rifle"
	case common.EqClassSMG:
		return "SMG"
	case common.EqClassHeavy:
		return "Heavy"
	case common.EqClassPistols:
		return "Pistol"
	case common.EqClassGrenade:
		return "Grenade"
	case common.EqClassEquipment:
		return "Equipment"
	default:
		return "Unknown"
	}
}

func roundEndReasonToString(reason events.RoundEndReason) string {
	switch reason {
	case events.RoundEndReasonTargetBombed:
		return "TargetBombed"
	case events.RoundEndReasonBombDefused:
		return "BombDefused"
	case events.RoundEndReasonTerroristsWin:
		return "TerroristsWin"
	case events.RoundEndReasonCTWin:
		return "CTWin"
	case events.RoundEndReasonTargetSaved:
		return "TargetSaved"
	case events.RoundEndReasonTerroristsSurrender:
		return "TerroristsSurrender"
	case events.RoundEndReasonCTSurrender:
		return "CTSurrender"
	default:
		return "Unknown"
	}
}

func parseDemoInternal(data js.Value, callback js.Value, optionsArgs []js.Value) {
	options := ParseOptions{
		TickInterval: 10,
	}

	if len(optionsArgs) > 0 && optionsArgs[0].Type() == js.TypeObject {
		if !optionsArgs[0].Get("tickInterval").IsUndefined() {
			options.TickInterval = optionsArgs[0].Get("tickInterval").Int()
		}
	}

	b := bytes.NewBuffer(uint8ArrayToBytes(data))
	parser := dem.NewParser(b)

	header, err := parser.ParseHeader()
	if err != nil {
		callback.Invoke(createErrorResult(err))
		return
	}

	result := &ParseResult{
		Header:      make(map[string]interface{}),
		Ticks:       []PlayerPosition{},
		Kills:       []KillEvent{},
		Damages:     []DamageEvent{},
		WeaponFires: []WeaponFireEvent{},
		Flashes:     []FlashEvent{},
		Grenades:    []GrenadeEvent{},
		Smokes:      []SmokeEvent{},
		Bombs:       []BombEvent{},
		Rounds:      []RoundEvent{},
		Players:     []PlayerStats{},
	}

	// Store initial header info
	result.Header["clientName"] = header.ClientName
	result.Header["serverName"] = header.ServerName
	result.Header["networkProtocol"] = header.NetworkProtocol
	// Use header.MapName as the initial value.
	result.Header["mapName"] = header.MapName

	// FIX 1/2: Correctly define the state variables accessible by closures
	lastRecordedTick := -999999 // Start with very negative number to ensure first frame is captured
	currentRound := RoundEvent{}
	tickRateKnown := false
	actualTickInterval := options.TickInterval

	// Round start
	parser.RegisterEventHandler(func(e events.RoundStart) {
		gs := parser.GameState()

		currentRound = RoundEvent{
			RoundNum:      len(result.Rounds) + 1,
			StartTick:     parser.CurrentFrame(),
			CTScore:       gs.TeamCounterTerrorists().Score(),
			TScore:        gs.TeamTerrorists().Score(),
			BombPlantTick: -1,
		}
	})

	// Freeze time end
	parser.RegisterEventHandler(func(e events.RoundFreezetimeEnd) {
		currentRound.FreezeTimeEndTick = parser.CurrentFrame()

		gs := parser.GameState()

		// Calculate team money and equipment value at freeze time end
		ctMoney := 0
		tMoney := 0
		ctEquip := 0
		tEquip := 0

		for _, player := range gs.Participants().Playing() {
			if player.Team == common.TeamCounterTerrorists {
				ctMoney += player.Money()
				ctEquip += player.EquipmentValueCurrent()
			} else if player.Team == common.TeamTerrorists {
				tMoney += player.Money()
				tEquip += player.EquipmentValueCurrent()
			}
		}

		currentRound.CTStartMoney = ctMoney
		currentRound.TStartMoney = tMoney
		currentRound.CTEquipmentValue = ctEquip
		currentRound.TEquipmentValue = tEquip
	})

	// Kills
	parser.RegisterEventHandler(func(e events.Kill) {
		kill := KillEvent{
			Tick:              parser.CurrentFrame(),
			IsHeadshot:        e.IsHeadshot,
			PenetratedObjects: e.PenetratedObjects,
			IsFlashAssist:     e.AssistedFlash,
			IsThroughSmoke:    e.ThroughSmoke,
		}

		if e.Weapon != nil {
			kill.Weapon = e.Weapon.Type.String()
			kill.WeaponClass = equipmentClassToString(e.Weapon.Class())
		}

		if e.Killer != nil {
			kill.AttackerID = e.Killer.SteamID64
			kill.AttackerName = e.Killer.Name
			kill.AttackerTeam = e.Killer.TeamState.ClanName()
			kill.AttackerSide = teamToString(e.Killer.Team)
			pos := e.Killer.Position()
			kill.AttackerX = float64(pos.X)
			kill.AttackerY = float64(pos.Y)
		}

		if e.Victim != nil {
			kill.VictimID = e.Victim.SteamID64
			kill.VictimName = e.Victim.Name
			kill.VictimTeam = e.Victim.TeamState.ClanName()
			kill.VictimSide = teamToString(e.Victim.Team)
			pos := e.Victim.Position()
			kill.VictimX = float64(pos.X)
			kill.VictimY = float64(pos.Y)
		}

		if e.Assister != nil {
			kill.AssisterID = e.Assister.SteamID64
			kill.AssisterName = e.Assister.Name
		}

		result.Kills = append(result.Kills, kill)
	})

	// Damage
	parser.RegisterEventHandler(func(e events.PlayerHurt) {
		damage := DamageEvent{
			Tick:        parser.CurrentFrame(),
			Damage:      e.HealthDamage,
			DamageArmor: e.ArmorDamage,
			Health:      e.Health,
			Armor:       e.Armor,
			Hitgroup:    hitgroupToString(e.HitGroup),
		}

		if e.Weapon != nil {
			damage.Weapon = e.Weapon.Type.String()
			damage.WeaponClass = equipmentClassToString(e.Weapon.Class())
		}

		if e.Attacker != nil {
			damage.AttackerID = e.Attacker.SteamID64
		}
		if e.Player != nil {
			damage.VictimID = e.Player.SteamID64
		}

		result.Damages = append(result.Damages, damage)
	})

	// Weapon fire
	parser.RegisterEventHandler(func(e events.WeaponFire) {
		if e.Shooter == nil {
			return
		}

		pos := e.Shooter.Position()
		fire := WeaponFireEvent{
			Tick:        parser.CurrentFrame(),
			ShooterID:   e.Shooter.SteamID64,
			ShooterName: e.Shooter.Name,
			Weapon:      e.Weapon.Type.String(),
			X:           float64(pos.X),
			Y:           float64(pos.Y),
		}
		result.WeaponFires = append(result.WeaponFires, fire)
	})

	// Player flashed
	parser.RegisterEventHandler(func(e events.PlayerFlashed) {
		if e.Attacker == nil || e.Player == nil {
			return
		}

		flash := FlashEvent{
			Tick:          parser.CurrentFrame(),
			AttackerID:    e.Attacker.SteamID64,
			AttackerName:  e.Attacker.Name,
			VictimID:      e.Player.SteamID64,
			VictimName:    e.Player.Name,
			FlashDuration: e.Player.FlashDuration,
		}
		result.Flashes = append(result.Flashes, flash)
	})

	// Grenade throw
	parser.RegisterEventHandler(func(e events.GrenadeProjectileThrow) {
		grenade := GrenadeEvent{
			Tick:      parser.CurrentFrame(),
			EventType: "thrown",
		}

		if e.Projectile.WeaponInstance != nil {
			grenade.GrenadeType = e.Projectile.WeaponInstance.Type.String()
		}

		if e.Projectile.Thrower != nil {
			grenade.ThrowerID = e.Projectile.Thrower.SteamID64
			grenade.ThrowerName = e.Projectile.Thrower.Name
			grenade.ThrowerTeam = e.Projectile.Thrower.TeamState.ClanName()
			grenade.ThrowerSide = teamToString(e.Projectile.Thrower.Team)
		}

		pos := e.Projectile.Position()
		grenade.X = float64(pos.X)
		grenade.Y = float64(pos.Y)

		result.Grenades = append(result.Grenades, grenade)
	})

	// Grenade detonate (HE/Flash)
	parser.RegisterEventHandler(func(e events.GrenadeProjectileDestroy) {
		grenade := GrenadeEvent{
			Tick:      parser.CurrentFrame(),
			EventType: "detonate",
		}

		if e.Projectile.WeaponInstance != nil {
			grenade.GrenadeType = e.Projectile.WeaponInstance.Type.String()
		}

		if e.Projectile.Thrower != nil {
			grenade.ThrowerID = e.Projectile.Thrower.SteamID64
			grenade.ThrowerName = e.Projectile.Thrower.Name
			grenade.ThrowerTeam = e.Projectile.Thrower.TeamState.ClanName()
			grenade.ThrowerSide = teamToString(e.Projectile.Thrower.Team)
		}

		pos := e.Projectile.Position()
		grenade.X = float64(pos.X)
		grenade.Y = float64(pos.Y)

		result.Grenades = append(result.Grenades, grenade)
	})

	// Smoke start
	parser.RegisterEventHandler(func(e events.SmokeStart) {
		smoke := SmokeEvent{
			Tick:      parser.CurrentFrame(),
			EventType: "start",
			X:         float64(e.Position.X),
			Y:         float64(e.Position.Y),
		}

		result.Smokes = append(result.Smokes, smoke)
	})

	// Smoke expire
	parser.RegisterEventHandler(func(e events.SmokeExpired) {
		smoke := SmokeEvent{
			Tick:      parser.CurrentFrame(),
			EventType: "expire",
			X:         float64(e.Position.X),
			Y:         float64(e.Position.Y),
		}

		result.Smokes = append(result.Smokes, smoke)
	})

	// Bomb planted
	parser.RegisterEventHandler(func(e events.BombPlanted) {
		currentRound.BombPlantTick = parser.CurrentFrame()

		bomb := BombEvent{
			Tick:  parser.CurrentFrame(),
			Event: "planted",
			Site:  bombsiteToString(e.Site),
		}

		if e.Player != nil {
			bomb.PlayerID = e.Player.SteamID64
			bomb.PlayerName = e.Player.Name
			pos := e.Player.Position()
			bomb.X = float64(pos.X)
			bomb.Y = float64(pos.Y)
		}

		result.Bombs = append(result.Bombs, bomb)
	})

	// Bomb defuse start
	parser.RegisterEventHandler(func(e events.BombDefuseStart) {
		bomb := BombEvent{
			Tick:  parser.CurrentFrame(),
			Event: "defuse_start",
		}

		if e.Player != nil {
			bomb.PlayerID = e.Player.SteamID64
			bomb.PlayerName = e.Player.Name
			pos := e.Player.Position()
			bomb.X = float64(pos.X)
			bomb.Y = float64(pos.Y)
		}

		result.Bombs = append(result.Bombs, bomb)
	})

	// Bomb defuse aborted
	parser.RegisterEventHandler(func(e events.BombDefuseAborted) {
		bomb := BombEvent{
			Tick:  parser.CurrentFrame(),
			Event: "defuse_stop",
		}

		if e.Player != nil {
			bomb.PlayerID = e.Player.SteamID64
			bomb.PlayerName = e.Player.Name
			pos := e.Player.Position()
			bomb.X = float64(pos.X)
			bomb.Y = float64(pos.Y)
		}

		result.Bombs = append(result.Bombs, bomb)
	})

	// Bomb defused
	parser.RegisterEventHandler(func(e events.BombDefused) {
		bomb := BombEvent{
			Tick:  parser.CurrentFrame(),
			Event: "defused",
		}

		if e.Player != nil {
			bomb.PlayerID = e.Player.SteamID64
			bomb.PlayerName = e.Player.Name
			pos := e.Player.Position()
			bomb.X = float64(pos.X)
			bomb.Y = float64(pos.Y)
		}

		result.Bombs = append(result.Bombs, bomb)
	})

	// Bomb exploded
	parser.RegisterEventHandler(func(e events.BombExplode) {
		bomb := BombEvent{
			Tick:  parser.CurrentFrame(),
			Event: "exploded",
		}

		result.Bombs = append(result.Bombs, bomb)
	})

	// Round end
	parser.RegisterEventHandler(func(e events.RoundEnd) {
		gs := parser.GameState()
		currentRound.EndTick = parser.CurrentFrame()
		currentRound.Winner = teamToString(e.Winner)
		currentRound.WinnerSide = teamToString(e.Winner)
		currentRound.Reason = roundEndReasonToString(e.Reason)
		currentRound.CTScore = gs.TeamCounterTerrorists().Score()
		currentRound.TScore = gs.TeamTerrorists().Score()

		result.Rounds = append(result.Rounds, currentRound)
	})

	// Frame done - capture player positions
	parser.RegisterEventHandler(func(e events.FrameDone) {
		frame := parser.CurrentFrame()

		// Calculate actual tick interval based on tick rate once we know it
		if !tickRateKnown && parser.TickRate() > 0 {
			tickRate := parser.TickRate()
			// If we want sampling at ~10 ticks, calculate interval based on actual tick rate
			// For 64 tick: 64/10 = ~6 ticks interval
			// For 128 tick: 128/10 = ~12 ticks interval
			actualTickInterval = int(tickRate / 10.0)
			if actualTickInterval < 1 {
				actualTickInterval = 1
			}
			tickRateKnown = true
			fmt.Println("Tick rate:", tickRate, "Actual tick interval:", actualTickInterval)
		}

		if frame-lastRecordedTick >= actualTickInterval {
			lastRecordedTick = frame

			gameState := parser.GameState()
			for _, player := range gameState.Participants().Playing() {
				pos := player.Position()
				vel := player.Velocity()

				activeWeapon := "none"
				if player.ActiveWeapon() != nil {
					activeWeapon = player.ActiveWeapon().Type.String()
				}

				position := PlayerPosition{
					Tick:           frame,
					SteamID:        player.SteamID64,
					Name:           player.Name,
					Team:           player.TeamState.ClanName(),
					Side:           teamToString(player.Team),
					X:              float64(pos.X),
					Y:              float64(pos.Y),
					ViewX:          player.ViewDirectionX(),
					ViewY:          player.ViewDirectionY(),
					VelocityX:      float64(vel.X),
					VelocityY:      float64(vel.Y),
					IsAlive:        player.IsAlive(),
					Health:         player.Health(),
					Armor:          player.Armor(),
					HasHelmet:      player.HasHelmet(),
					HasDefuseKit:   player.HasDefuseKit(),
					Money:          player.Money(),
					EquipmentValue: player.EquipmentValueCurrent(),
					ActiveWeapon:   activeWeapon,
					IsScoped:       player.IsScoped(),
					IsDucking:      player.IsDucking(),
					IsWalking:      player.IsWalking(),
				}

				result.Ticks = append(result.Ticks, position)
			}
		}
	})

	// Parse to end
	err = parser.ParseToEnd()
	if err != nil {
		callback.Invoke(createErrorResult(err))
		return
	}

	fmt.Println("Parsed successfully")

	// FIX: Use parser.Header().MapName or parser.Map() with a non-reserved variable name
	finalMapName := parser.Header().MapName
	if finalMapName != "" {
		result.Header["mapName"] = finalMapName
	} else {
		// Fallback check using the Map() object (less common in older demos)
		result.Header["mapName"] = ""
	}

	// Get tick rate after parsing (when it's available)
	result.Header["tickRate"] = parser.TickRate()

	// If map name is still empty, try one more time from convars (your original fallback logic)
	if result.Header["mapName"] == "" || result.Header["mapName"] == nil {
		gs := parser.GameState()
		if convars := gs.Rules().ConVars(); convars != nil {
			if mapName, ok := convars["host_map"]; ok && mapName != "" {
				result.Header["mapName"] = mapName
			} else if mapName, ok := convars["map"]; ok && mapName != "" {
				result.Header["mapName"] = mapName
			}
		}
	}

	fmt.Println("Final Map:", result.Header["mapName"], "TickRate:", parser.TickRate(), "Total ticks captured:", len(result.Ticks))

	// Get final player stats
	players := parser.GameState().Participants().Playing()
	for _, p := range players {
		stats := PlayerStats{
			Name:    p.Name,
			SteamID: p.SteamID64,
			Team:    p.TeamState.ClanName(),
			Side:    teamToString(p.Team),
			Kills:   p.Kills(),
			Deaths:  p.Deaths(),
			Assists: p.Assists(),
			MVPs:    p.MVPs(),
			Score:   p.Score(),
		}
		result.Players = append(result.Players, stats)
	}

	// Convert to JSON and return
	jsonData, err := json.Marshal(result)
	if err != nil {
		callback.Invoke(createErrorResult(err))
		return
	}

	callback.Invoke(string(jsonData))
}

func createErrorResult(err error) string {
	errorObj := map[string]interface{}{
		"error": err.Error(),
	}
	jsonData, _ := json.Marshal(errorObj)
	return string(jsonData)
}

func checkError(err error) {
	if err != nil {
		log.Panic(err)
	}
}
