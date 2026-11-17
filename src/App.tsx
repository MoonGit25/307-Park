import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud, type HudSummary } from './components/GameHud';
import { PauseModal, StageSelectModal, VictoryModal } from './components/GameModals';
import { LobbyModal } from './components/LobbyModal';
import { TitleScreen } from './components/TitleScreen';
import { createStageState, getLevelCount, getLevelDef, stepSimulation } from './game/engine';
import { SnapshotInterpolator } from './game/interpolator';
import { getLevelsByBracket, LEVELS } from './game/levels';
import { PicoRenderer } from './game/renderer';
import { soundFX } from './game/sound';
import {
  PLAYER_PALETTES,
  type GameState,
  type PlayerBracket,
  type PlayerColorId,
  type PlayerInput,
  type PlayerSpec,
} from './game/types';
import {
  detectDeviceType,
  loadLocalPlayerMeta,
  saveLocalPlayerMeta,
  useLanSocket,
} from './hooks/useLanSocket';

type ScreenPhase = 'title' | 'playing' | 'paused' | 'gameover';
type PlayMode = 'local' | 'lan';
type LocalCoopMode = 'solo-switch' | '2p-shared';

const DEFAULT_HUD: HudSummary = {
  stageIndex: 0,
  stageNumber: 1,
  bracket: '2p',
  stageName: LEVELS[0].name,
  stageHint: LEVELS[0].hint,
  keyCollected: false,
  doorUnlocked: false,
  playersInDoor: 0,
  totalPlayers: 2,
  elapsedTime: 0,
  deaths: 0,
  roomCode: null,
  isLanHost: false,
  isLocalSoloSwitch: true,
  activeCatLabel: 'P1',
};

export default function App() {
  const initialMeta = useRef(loadLocalPlayerMeta());
  const deviceType = useRef<'pc' | 'mobile'>(detectDeviceType());

  const [phase, setPhase] = useState<ScreenPhase>('title');
  const [playMode, setPlayMode] = useState<PlayMode>('local');
  const [localCoopMode, setLocalCoopMode] = useState<LocalCoopMode>('solo-switch');
  const [showLobby, setShowLobby] = useState(false);
  const [showStages, setShowStages] = useState(false);
  const [initialRoomCode, setInitialRoomCode] = useState('');
  const [playerName, setPlayerName] = useState(
    initialMeta.current.name || (deviceType.current === 'mobile' ? 'MobileCat' : 'PCCat'),
  );
  const [playerColor, setPlayerColor] = useState<PlayerColorId>(initialMeta.current.color);
  const [muted, setMuted] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(deviceType.current === 'mobile');
  const [hud, setHud] = useState<HudSummary>(DEFAULT_HUD);
  const [victorySnapshot, setVictorySnapshot] = useState<{
    stageIndex: number;
    stageNumber: number;
    bracket: PlayerBracket;
    stageName: string;
    elapsedTime: number;
    deaths: number;
  } | null>(null);

  const lan = useLanSocket();
  const lanRef = useRef(lan);
  lanRef.current = lan;

  // Simulation & Canvas refs (completely decoupled from React 60Hz renders)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PicoRenderer | null>(null);
  const interpolatorRef = useRef<SnapshotInterpolator>(new SnapshotInterpolator());
  const localStateRef = useRef<GameState | null>(null);
  const activeLocalCatIdxRef = useRef(0);
  const phaseRef = useRef<ScreenPhase>('title');
  const playModeRef = useRef<PlayMode>('local');
  const localCoopModeRef = useRef<LocalCoopMode>('solo-switch');
  const showTouchRef = useRef(showTouchControls);
  const showLobbyRef = useRef(showLobby);
  const showStagesRef = useRef(showStages);

  const keysHeldRef = useRef<Set<string>>(new Set());
  const touchHeldRef = useRef<PlayerInput>({ left: false, right: false, jump: false });
  const lastHudSyncRef = useRef(0);
  const lastHudSigRef = useRef('');

  // Keep refs synced
  phaseRef.current = phase;
  playModeRef.current = playMode;
  localCoopModeRef.current = localCoopMode;
  showTouchRef.current = showTouchControls;
  showLobbyRef.current = showLobby;
  showStagesRef.current = showStages;

  // Mirror state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = phase;
  }, [phase]);

  const clearAllInputs = useCallback(() => {
    keysHeldRef.current.clear();
    touchHeldRef.current = { left: false, right: false, jump: false };
    if (playModeRef.current === 'lan') {
      lanRef.current.sendInput({ left: false, right: false, jump: false });
    }
  }, []);

  const buildLocalSpecs = useCallback(
    (count = 2): PlayerSpec[] => {
      const specs: PlayerSpec[] = [
        { id: 'local-1', name: 'P1', color: playerColor, deviceType: deviceType.current },
      ];
      const remainingPalette = PLAYER_PALETTES.filter((p) => p.id !== playerColor);
      for (let i = 1; i < count; i++) {
        const pal = remainingPalette[(i - 1) % remainingPalette.length];
        specs.push({
          id: `local-${i + 1}`,
          name: `P${i + 1}`,
          color: pal.id,
          deviceType: deviceType.current,
        });
      }
      return specs;
    },
    [playerColor],
  );

  const startLocalStage = useCallback(
    (stageIdx: number, unlockAudio = true) => {
      if (unlockAudio) {
        soundFX.unlock();
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      clearAllInputs();
      const lvl = getLevelDef(stageIdx);
      const specs = buildLocalSpecs(lvl.recommendedPlayers);
      localStateRef.current = createStageState(stageIdx, specs);
      activeLocalCatIdxRef.current = 0;
      setPlayMode('local');
      setShowLobby(false);
      setShowStages(false);
      setVictorySnapshot(null);
      setPhase('playing');
      document.body.dataset.state = 'playing';
      canvasRef.current?.focus();
    },
    [buildLocalSpecs, clearAllInputs],
  );

  const cycleLocalCat = useCallback(() => {
    const count = localStateRef.current?.players.length ?? 2;
    activeLocalCatIdxRef.current = (activeLocalCatIdxRef.current + 1) % Math.max(1, count);
  }, []);

  // Handle URL query params (?autostart=1 or ?room=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const autostart = params.get('autostart');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase());
      setShowLobby(true);
    } else if (autostart === '1') {
      startLocalStage(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to LAN Room Phase transitions
  useEffect(() => {
    if (!lan.room) return;
    if (lan.room.phase === 'playing') {
      interpolatorRef.current.reset();
      setPlayMode('lan');
      setShowLobby(false);
      setShowStages(false);
      setVictorySnapshot(null);
      setPhase('playing');
      document.body.dataset.state = 'playing';
    } else if (lan.room.phase === 'cleared') {
      const snap = lan.snapshotRef.current;
      const lvl = getLevelDef(lan.room.stageIndex);
      setVictorySnapshot({
        stageIndex: lan.room.stageIndex,
        stageNumber: lvl.stageNumber,
        bracket: lvl.bracket,
        stageName: lvl.name,
        elapsedTime: snap?.elapsedTime ?? 0,
        deaths: snap?.deaths ?? 0,
      });
      setPhase('gameover');
      document.body.dataset.state = 'gameover';
    } else if (lan.room.phase === 'lobby' && playModeRef.current === 'lan') {
      interpolatorRef.current.reset();
      setShowLobby(true);
      setPhase('title');
      document.body.dataset.state = 'title';
    }
  }, [lan.room?.phase, lan.room?.stageIndex, lan.snapshotRef]);

  // Global keyboard & blur listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (phaseRef.current === 'title' && !showLobbyRef.current && !showStagesRef.current) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startLocalStage(0);
          return;
        }
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (phaseRef.current === 'playing') {
          e.preventDefault();
          clearAllInputs();
          setPhase('paused');
          return;
        }
        if (phaseRef.current === 'paused') {
          e.preventDefault();
          clearAllInputs();
          setPhase('playing');
          return;
        }
      }

      if (e.code === 'KeyM') {
        const nextMuted = soundFX.toggleMute();
        setMuted(nextMuted);
        return;
      }

      if (phaseRef.current !== 'playing') return;

      if (e.code === 'KeyR') {
        e.preventDefault();
        if (playModeRef.current === 'local' && localStateRef.current) {
          startLocalStage(localStateRef.current.stageIndex);
        } else if (
          playModeRef.current === 'lan' &&
          lanRef.current.room &&
          lanRef.current.room.hostId === lanRef.current.playerId
        ) {
          lanRef.current.sendMessage({ type: 'restart_stage' });
        }
        return;
      }

      if (e.code === 'Tab' && playModeRef.current === 'local') {
        e.preventDefault();
        cycleLocalCat();
        return;
      }

      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW'].includes(
          e.code,
        )
      ) {
        e.preventDefault();
        soundFX.unlock();
        keysHeldRef.current.add(e.code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const onBlurOrHidden = () => {
      clearAllInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrHidden);
    document.addEventListener('visibilitychange', onBlurOrHidden);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurOrHidden);
      document.removeEventListener('visibilitychange', onBlurOrHidden);
    };
  }, [clearAllInputs, cycleLocalCat, startLocalStage]);

  // Mount Canvas2D & 60Hz animation/simulation loop ONCE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new PicoRenderer();
    rendererRef.current = renderer;

    let cssW = window.innerWidth;
    let cssH = window.innerHeight;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cssW = Math.max(320, rect.width || window.innerWidth);
      cssH = Math.max(240, rect.height || window.innerHeight);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let rafId = 0;
    let lastTime = performance.now();

    const processSimEvents = (state: GameState) => {
      for (const ev of state.events) {
        soundFX.trigger(ev.type);
        if (ev.type === 'jump' || ev.type === 'land') {
          renderer.spawnBurst(ev.x, ev.y, 4, '#E5E7EB', 80, 4);
        } else if (ev.type === 'spring') {
          renderer.spawnBurst(ev.x, ev.y, 10, ev.color ?? '#22C55E', 140, 5);
        } else if (ev.type === 'key' || ev.type === 'unlock') {
          renderer.spawnBurst(ev.x, ev.y, 16, '#FACC15', 160, 6);
          renderer.addShake(0.22);
        } else if (ev.type === 'button') {
          renderer.spawnBurst(ev.x, ev.y, 8, ev.color ?? '#F48C42', 110, 5);
        } else if (ev.type === 'death') {
          renderer.spawnBurst(ev.x, ev.y, 20, '#EF4444', 180, 6);
          renderer.addShake(0.45);
          renderer.triggerHitstop(0.05);
        } else if (ev.type === 'clear') {
          renderer.spawnBurst(ev.x, ev.y, 28, '#F48C42', 200, 7);
          renderer.addShake(0.25);
        }
      }
      state.events = [];
    };

    const syncHudIfChanged = (state: GameState) => {
      const now = performance.now();
      const playersInDoor = state.players.filter((p) => p.inDoor).length;
      const elapsedWhole = Math.floor(state.elapsedTime);
      const isLocalMultiCat =
        playModeRef.current === 'local' &&
        (localCoopModeRef.current === 'solo-switch' || state.players.length > 2);
      const activeCatLabel = `P${activeLocalCatIdxRef.current + 1}`;
      const lanRoom = lanRef.current.room;
      const lanPid = lanRef.current.playerId;
      const sig = `${state.stageIndex}|${state.bracket}|${state.key.collected}|${state.door.unlocked}|${playersInDoor}|${state.players.length}|${state.deaths}|${elapsedWhole}|${activeCatLabel}|${playModeRef.current}|${isLocalMultiCat}|${lanRoom?.code ?? ''}`;

      if (sig !== lastHudSigRef.current || now - lastHudSyncRef.current > 300) {
        lastHudSigRef.current = sig;
        lastHudSyncRef.current = now;
        setHud({
          stageIndex: state.stageIndex,
          stageNumber: state.stageNumber,
          bracket: state.bracket,
          stageName: state.stageName,
          stageHint: state.stageHint,
          keyCollected: state.key.collected,
          doorUnlocked: state.door.unlocked,
          playersInDoor,
          totalPlayers: state.players.length,
          elapsedTime: state.elapsedTime,
          deaths: state.deaths,
          roomCode: playModeRef.current === 'lan' ? lanRoom?.code ?? null : null,
          isLanHost:
            playModeRef.current === 'lan' &&
            Boolean(lanRoom && lanRoom.hostId === lanPid),
          isLocalSoloSwitch: isLocalMultiCat,
          activeCatLabel,
        });
      }
    };

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      renderer.updateEffects(dt);

      if (phaseRef.current === 'title') {
        if (!showLobbyRef.current && !showStagesRef.current) {
          renderer.renderTitleDiorama(ctx, cssW, cssH, now / 1000);
        }
        rafId = requestAnimationFrame(frame);
        return;
      }

      const keys = keysHeldRef.current;
      const touch = touchHeldRef.current;

      if (playModeRef.current === 'local') {
        const state = localStateRef.current;
        if (state) {
          if (phaseRef.current === 'playing' && !renderer.isHitstopped(dt)) {
            const p1Input: PlayerInput =
              localCoopModeRef.current === '2p-shared'
                ? {
                    left: keys.has('KeyA') || touch.left,
                    right: keys.has('KeyD') || touch.right,
                    jump: keys.has('KeyW') || keys.has('Space') || touch.jump,
                  }
                : {
                    left: keys.has('KeyA') || keys.has('ArrowLeft') || touch.left,
                    right: keys.has('KeyD') || keys.has('ArrowRight') || touch.right,
                    jump:
                      keys.has('KeyW') ||
                      keys.has('ArrowUp') ||
                      keys.has('Space') ||
                      touch.jump,
                  };

            const p2Input: PlayerInput = {
              left: keys.has('ArrowLeft'),
              right: keys.has('ArrowRight'),
              jump: keys.has('ArrowUp'),
            };

            const inputs: Record<string, PlayerInput> = {};
            const idle: PlayerInput = { left: false, right: false, jump: false };

            if (localCoopModeRef.current === '2p-shared') {
              const activeExtra = activeLocalCatIdxRef.current;
              for (let i = 0; i < state.players.length; i++) {
                const pid = state.players[i].id;
                if (i === 0) inputs[pid] = p1Input;
                else if (i === 1) inputs[pid] = p2Input;
                else if (i === activeExtra) inputs[pid] = p1Input;
                else inputs[pid] = idle;
              }
            } else {
              const activeIdx = activeLocalCatIdxRef.current % state.players.length;
              for (let i = 0; i < state.players.length; i++) {
                const pid = state.players[i].id;
                inputs[pid] = i === activeIdx ? p1Input : idle;
              }
            }

            stepSimulation(state, inputs, dt);
            processSimEvents(state);

            if (state.status === 'cleared') {
              setVictorySnapshot({
                stageIndex: state.stageIndex,
                stageNumber: state.stageNumber,
                bracket: state.bracket,
                stageName: state.stageName,
                elapsedTime: state.elapsedTime,
                deaths: state.deaths,
              });
              setPhase('gameover');
              document.body.dataset.state = 'gameover';
            }
          }

          const activePlayer =
            state.players[activeLocalCatIdxRef.current % state.players.length] ?? state.players[0];

          renderer.renderGame(
            ctx,
            cssW,
            cssH,
            state,
            activePlayer?.id ?? null,
            showTouchRef.current,
          );
          syncHudIfChanged(state);
        }
      } else {
        // LAN Multiplayer Mode: send local input to Node.js WebSocket server, interpolate & render snapshot
        if (phaseRef.current === 'playing') {
          const lanInput: PlayerInput = {
            left: keys.has('KeyA') || keys.has('ArrowLeft') || touch.left,
            right: keys.has('KeyD') || keys.has('ArrowRight') || touch.right,
            jump:
              keys.has('KeyW') ||
              keys.has('ArrowUp') ||
              keys.has('Space') ||
              touch.jump,
          };
          lanRef.current.sendInput(lanInput);
        }

        const rawSnap = lanRef.current.snapshotRef.current;
        if (rawSnap) {
          if (lanRef.current.eventQueueRef.current.length > 0) {
            const drained: GameState = {
              ...rawSnap,
              events: lanRef.current.eventQueueRef.current.splice(0),
            };
            processSimEvents(drained);
          }
          const smoothState = interpolatorRef.current.step(rawSnap, dt);
          if (smoothState) {
            renderer.renderGame(
              ctx,
              cssW,
              cssH,
              smoothState,
              lanRef.current.playerId,
              showTouchRef.current,
            );
            syncHudIfChanged(smoothState);
          }
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const handleTouchInput = useCallback((key: 'left' | 'right' | 'jump', pressed: boolean) => {
    soundFX.unlock();
    touchHeldRef.current = {
      ...touchHeldRef.current,
      [key]: pressed,
    };
  }, []);

  const handleUpdateName = (name: string) => {
    setPlayerName(name);
    saveLocalPlayerMeta(name, playerColor);
    if (lan.room) {
      lan.sendMessage({ type: 'update_meta', name, color: playerColor });
    }
  };

  const handleUpdateColor = (color: PlayerColorId) => {
    setPlayerColor(color);
    saveLocalPlayerMeta(playerName, color);
    if (lan.room) {
      lan.sendMessage({ type: 'update_meta', name: playerName, color });
    }
  };

  const handleExitToTitle = () => {
    clearAllInputs();
    if (playMode === 'lan') {
      lan.leaveRoom();
    }
    interpolatorRef.current.reset();
    localStateRef.current = null;
    setVictorySnapshot(null);
    setPhase('title');
    document.body.dataset.state = 'title';
  };

  const handleNextStage = () => {
    if (playMode === 'lan') {
      lan.sendMessage({ type: 'next_stage' });
      return;
    }
    const currIdx = localStateRef.current?.stageIndex ?? 0;
    const currLvl = getLevelDef(currIdx);
    const bracketLvls = getLevelsByBracket(currLvl.bracket);
    const pos = bracketLvls.findIndex((l) => l.index === currIdx);
    const nextLvl =
      bracketLvls[(pos + 1) % bracketLvls.length] ??
      getLevelDef((currIdx + 1) % getLevelCount());
    startLocalStage(nextLvl.index);
  };

  const handleReplayStage = () => {
    if (playMode === 'lan') {
      lan.sendMessage({ type: 'restart_stage' });
      return;
    }
    const currIdx = localStateRef.current?.stageIndex ?? 0;
    startLocalStage(currIdx);
  };

  const isFinalInBracket = (() => {
    if (!victorySnapshot) return false;
    const list = getLevelsByBracket(victorySnapshot.bracket);
    return list[list.length - 1]?.index === victorySnapshot.stageIndex;
  })();

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden bg-white select-none">
      {/* Isolated Canvas Container */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        tabIndex={0}
        className="block w-full h-full outline-none touch-none"
      />

      {/* Title Screen Overlay */}
      {phase === 'title' && (
        <TitleScreen
          onStartLocal={() => startLocalStage(0)}
          onOpenLan={() => setShowLobby(true)}
          onOpenStages={() => setShowStages(true)}
        />
      )}

      {/* Playing HUD */}
      {(phase === 'playing' || phase === 'paused') && (
        <GameHud
          hud={hud}
          muted={muted}
          showTouchControls={showTouchControls}
          onToggleMute={() => setMuted(soundFX.toggleMute())}
          onToggleTouchControls={() => setShowTouchControls((v) => !v)}
          onRestart={handleReplayStage}
          onPause={() => {
            clearAllInputs();
            setPhase('paused');
          }}
          onSwitchCat={cycleLocalCat}
          onTouchInput={handleTouchInput}
        />
      )}

      {/* Pause Modal */}
      {phase === 'paused' && (
        <PauseModal
          stageName={hud.stageName}
          canRestart={playMode === 'local' || hud.isLanHost}
          onResume={() => setPhase('playing')}
          onRestart={handleReplayStage}
          onExitTitle={handleExitToTitle}
        />
      )}

      {/* Stage Clear / Victory Modal */}
      {phase === 'gameover' && victorySnapshot && (
        <VictoryModal
          stageNumber={victorySnapshot.stageNumber}
          bracket={victorySnapshot.bracket}
          stageName={victorySnapshot.stageName}
          elapsedTime={victorySnapshot.elapsedTime}
          deaths={victorySnapshot.deaths}
          isFinalStage={isFinalInBracket}
          isLanGuest={playMode === 'lan' && !hud.isLanHost}
          onNextStage={handleNextStage}
          onReplay={handleReplayStage}
          onExitTitle={handleExitToTitle}
        />
      )}

      {/* LAN Multiplayer Lobby Modal */}
      {showLobby && (
        <LobbyModal
          room={lan.room}
          playerId={lan.playerId}
          error={lan.error}
          initialJoinCode={initialRoomCode}
          playerName={playerName}
          playerColor={playerColor}
          onChangeName={handleUpdateName}
          onChangeColor={handleUpdateColor}
          onCreateRoom={() =>
            lan.connectAndSend({
              type: 'create_room',
              name: playerName,
              color: playerColor,
              deviceType: deviceType.current,
            })
          }
          onJoinRoom={(code) =>
            lan.connectAndSend({
              type: 'join_room',
              code,
              name: playerName,
              color: playerColor,
              deviceType: deviceType.current,
            })
          }
          onSelectStage={(stageIndex) =>
            lan.sendMessage({ type: 'select_stage', stageIndex })
          }
          onStartGame={() => lan.sendMessage({ type: 'start_game' })}
          onLeaveRoom={() => lan.leaveRoom()}
          onClose={() => setShowLobby(false)}
        />
      )}

      {/* Local Stage Select Modal */}
      {showStages && (
        <StageSelectModal
          localCoopMode={localCoopMode}
          onChangeLocalMode={setLocalCoopMode}
          onSelectStage={(idx) => startLocalStage(idx)}
          onClose={() => setShowStages(false)}
        />
      )}
    </main>
  );
}
