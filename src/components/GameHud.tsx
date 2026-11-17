import { useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Gamepad2,
  Pause,
  RefreshCw,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';

import type { PlayerBracket } from '../game/types';

export interface HudSummary {
  stageIndex: number;
  stageNumber: number;
  bracket: PlayerBracket;
  stageName: string;
  stageHint: string;
  keyCollected: boolean;
  doorUnlocked: boolean;
  playersInDoor: number;
  totalPlayers: number;
  elapsedTime: number;
  deaths: number;
  roomCode: string | null;
  isLanHost: boolean;
  isLocalSoloSwitch: boolean;
  activeCatLabel: string;
}

interface GameHudProps {
  hud: HudSummary;
  muted: boolean;
  showTouchControls: boolean;
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onRestart: () => void;
  onPause: () => void;
  onSwitchCat: () => void;
  onTouchInput: (key: 'left' | 'right' | 'jump', pressed: boolean) => void;
}

export function GameHud({
  hud,
  muted,
  showTouchControls,
  onToggleMute,
  onToggleTouchControls,
  onRestart,
  onPause,
  onSwitchCat,
  onTouchInput,
}: GameHudProps) {
  const activePointers = useRef<Map<number, 'left' | 'right' | 'jump'>>(new Map());

  const handlePointerDown = (
    key: 'left' | 'right' | 'jump',
    e: React.PointerEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    activePointers.current.set(e.pointerId, key);
    onTouchInput(key, true);
  };

  const handlePointerUp = (
    key: 'left' | 'right' | 'jump',
    e: React.PointerEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    activePointers.current.delete(e.pointerId);
    onTouchInput(key, false);
  };

  const mins = Math.floor(hud.elapsedTime / 60);
  const secs = Math.floor(hud.elapsedTime % 60);
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top Perimeter Strip (< 12% viewport height) */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Top-Left Cluster: Stage, Key & Door Status */}
        <div className="flex items-center gap-2 sm:gap-3 bg-white/95 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] px-2.5 sm:px-3 py-1 sm:py-1.5 min-w-0">
          <div className="leading-tight shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#F48C42]">
              {hud.bracket.toUpperCase()} · Stage {String(hud.stageNumber).padStart(2, '0')}/40
            </div>
            <div className="hidden sm:block text-sm sm:text-base font-extrabold text-[#1A1A1A] whitespace-nowrap">
              {hud.stageName}
            </div>
          </div>

          <div className="h-7 w-0.5 bg-neutral-200 hidden sm:block" />

          {/* Custom Key + Door Readout */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1A1A1A] font-mono-tabular whitespace-nowrap">
            <span className="inline-flex items-center gap-1" title="Golden Key">
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                <circle
                  cx="8"
                  cy="12"
                  r="4.5"
                  fill={hud.keyCollected || hud.doorUnlocked ? '#FDE047' : '#E5E7EB'}
                  stroke="#1A1A1A"
                  strokeWidth="2"
                />
                <path
                  d="M12.5 12H21M18 12V16M21 12V15"
                  stroke="#1A1A1A"
                  strokeWidth="2"
                  strokeLinecap="square"
                />
              </svg>
              <span>{hud.doorUnlocked ? 'OPEN' : hud.keyCollected ? 'KEY' : '0/1'}</span>
            </span>

            <span className="text-neutral-300" aria-hidden="true">
              ·
            </span>

            <span className="inline-flex items-center gap-1" title="Players in Door">
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                <path
                  d="M5 21V7L9 3H15L19 7V21H5Z"
                  fill={hud.doorUnlocked ? '#262626' : '#D6CFC7'}
                  stroke="#1A1A1A"
                  strokeWidth="2"
                />
                <rect x="8" y="12" width="2" height="3" fill={hud.doorUnlocked ? '#F48C42' : '#1A1A1A'} />
              </svg>
              <span>
                {hud.playersInDoor}/{hud.totalPlayers}
              </span>
            </span>

            <span className="hidden md:inline text-neutral-300" aria-hidden="true">
              ·
            </span>
            <span className="hidden md:inline text-neutral-600">{timeStr}</span>
          </div>
        </div>

        {/* Top-Center Hint (Desktop only, unobtrusive & unclipped) */}
        <div className="hidden xl:flex items-center px-3 py-1 text-xs font-semibold text-neutral-600 text-center">
          {hud.stageHint}
        </div>

        {/* Top-Right Compact Utility Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto shrink-0">
          {hud.roomCode && (
            <div className="hidden md:flex items-center px-2.5 h-9 bg-orange-50 border-2 border-[#1A1A1A] font-mono-tabular font-bold text-xs text-[#1A1A1A]">
              ROOM {hud.roomCode}
            </div>
          )}

          {hud.isLocalSoloSwitch && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSwitchCat();
              }}
              aria-label={`Switch Cat (${hud.activeCatLabel})`}
              title="Switch Cat [Tab]"
              className={`${
                showTouchControls ? 'hidden sm:flex' : 'flex'
              } h-8 sm:h-9 px-2 sm:px-2.5 items-center gap-1 bg-white hover:bg-neutral-50 border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] text-xs font-bold text-[#1A1A1A] cursor-pointer whitespace-nowrap`}
            >
              <Repeat className="w-3.5 h-3.5 text-[#F48C42]" />
              <span>{hud.activeCatLabel}</span>
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleTouchControls();
            }}
            aria-label={showTouchControls ? 'Hide Touch Controls' : 'Show Touch Controls'}
            title="Toggle Touch Controls"
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] cursor-pointer ${
              showTouchControls ? 'bg-[#F48C42] text-white' : 'bg-white text-[#1A1A1A] hover:bg-neutral-50'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title="Mute [M]"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white hover:bg-neutral-50 border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] text-[#1A1A1A] cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {(!hud.roomCode || hud.isLanHost) && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              aria-label="Restart Stage"
              title="Restart [R]"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white hover:bg-neutral-50 border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] text-[#1A1A1A] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause Game"
            title="Pause [Esc / P]"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white hover:bg-neutral-50 border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] text-[#1A1A1A] cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Multi-Touch Mobile Controls (visible on touch screens or when toggled) */}
      {showTouchControls && (
        <div className="flex items-end justify-between w-full pb-1 sm:pb-2 pointer-events-none select-none">
          {/* Left / Right Thumb Pad */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Move Left"
              onPointerDown={(e) => handlePointerDown('left', e)}
              onPointerUp={(e) => handlePointerUp('left', e)}
              onPointerCancel={(e) => handlePointerUp('left', e)}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'none' }}
              className="w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center bg-white/90 active:bg-[#F48C42] active:text-white border-[3px] border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] text-[#1A1A1A] cursor-pointer"
            >
              <ArrowLeft className="w-7 h-7 stroke-[2.75]" />
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Move Right"
              onPointerDown={(e) => handlePointerDown('right', e)}
              onPointerUp={(e) => handlePointerUp('right', e)}
              onPointerCancel={(e) => handlePointerUp('right', e)}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'none' }}
              className="w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center bg-white/90 active:bg-[#F48C42] active:text-white border-[3px] border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] text-[#1A1A1A] cursor-pointer"
            >
              <ArrowRight className="w-7 h-7 stroke-[2.75]" />
            </button>
          </div>

          {/* Right Thumb Actions: Switch (if solo) + Jump */}
          <div className="flex items-center gap-3 pointer-events-auto">
            {hud.isLocalSoloSwitch && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Switch Cat"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSwitchCat();
                }}
                style={{ touchAction: 'none' }}
                className="w-14 h-14 flex items-center justify-center bg-white/90 active:bg-neutral-200 border-[3px] border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] text-[#1A1A1A] font-extrabold text-xs cursor-pointer"
              >
                SWAP
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              aria-label="Jump"
              onPointerDown={(e) => handlePointerDown('jump', e)}
              onPointerUp={(e) => handlePointerUp('jump', e)}
              onPointerCancel={(e) => handlePointerUp('jump', e)}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'none' }}
              className="w-20 h-16 sm:w-22 sm:h-18 flex flex-col items-center justify-center bg-[#F48C42] active:bg-[#D9742B] text-white border-[3px] border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] font-extrabold text-xs cursor-pointer"
            >
              <ArrowUp className="w-7 h-7 stroke-[3]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
