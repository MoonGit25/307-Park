import { useState } from 'react';
import { ArrowRight, Home, Play, RefreshCw, X } from 'lucide-react';
import { getLevelsByBracket } from '../game/levels';
import type { PlayerBracket } from '../game/types';

interface PauseModalProps {
  stageName: string;
  canRestart: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExitTitle: () => void;
}

export function PauseModal({
  stageName,
  canRestart,
  onResume,
  onRestart,
  onExitTitle,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        className="w-full max-w-sm bg-white border-[3px] border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] p-6 text-center"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-[#F48C42]">Paused</div>
        <h2 className="mt-1 text-2xl font-extrabold text-[#1A1A1A]">{stageName}</h2>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#F48C42] hover:bg-[#E57B30] text-white font-bold border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume</span>
          </button>

          {canRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 text-[#1A1A1A] font-bold border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restart Stage</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExitTitle}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-[#1A1A1A] font-bold border-2 border-[#1A1A1A] cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Title</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface VictoryModalProps {
  stageNumber: number;
  bracket: PlayerBracket;
  stageName: string;
  elapsedTime: number;
  deaths: number;
  isFinalStage: boolean;
  isLanGuest: boolean;
  onNextStage: () => void;
  onReplay: () => void;
  onExitTitle: () => void;
}

export function VictoryModal({
  stageNumber,
  bracket,
  stageName,
  elapsedTime,
  deaths,
  isFinalStage,
  isLanGuest,
  onNextStage,
  onReplay,
  onExitTitle,
}: VictoryModalProps) {
  const secs = elapsedTime.toFixed(1);
  const bracketLabel =
    bracket === '2p'
      ? '2P Mode'
      : bracket === '3p'
        ? '3P Mode'
        : bracket === '4p'
          ? '4P Mode'
          : bracket === '5p'
            ? '5P Mode'
            : '6P+ Party';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Stage Clear"
        className="w-full max-w-md bg-white border-[3px] border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] p-6 text-center"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-[#F48C42]">
          {bracketLabel} · {isFinalStage ? 'All 40 Stages Complete' : `Stage ${stageNumber}/40 Clear`}
        </div>
        <h2 className="mt-1 text-3xl font-extrabold text-[#1A1A1A]">
          {isFinalStage ? '307 PARK CLEAR!' : stageName}
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="p-3 bg-orange-50/70 border-2 border-[#1A1A1A]">
            <div className="text-[11px] font-bold uppercase text-neutral-600">Clear Time</div>
            <div className="mt-0.5 text-2xl font-extrabold font-mono-tabular text-[#1A1A1A]">
              {secs}s
            </div>
          </div>
          <div className="p-3 bg-neutral-50 border-2 border-[#1A1A1A]">
            <div className="text-[11px] font-bold uppercase text-neutral-600">Resets</div>
            <div className="mt-0.5 text-2xl font-extrabold font-mono-tabular text-[#1A1A1A]">
              {deaths}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {isLanGuest ? (
            <div className="px-4 py-3 bg-neutral-100 border-2 border-[#1A1A1A] text-sm font-semibold text-neutral-700">
              Waiting for Host to advance...
            </div>
          ) : (
            <>
              <button
                type="button"
                data-start="true"
                onClick={onNextStage}
                className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#F48C42] hover:bg-[#E57B30] text-white font-bold border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] cursor-pointer"
              >
                <span>{isFinalStage ? 'Play Mode Again' : 'Next Stage'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onReplay}
                className="w-full h-11 inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 text-[#1A1A1A] font-bold border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Replay Stage</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onExitTitle}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-[#1A1A1A] font-bold border-2 border-[#1A1A1A] cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Title</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface StageSelectModalProps {
  localCoopMode: 'solo-switch' | '2p-shared';
  onChangeLocalMode: (mode: 'solo-switch' | '2p-shared') => void;
  onSelectStage: (stageIdx: number) => void;
  onClose: () => void;
}

const LOCAL_BRACKETS: Array<{ id: PlayerBracket; label: string; sub: string }> = [
  { id: '2p', label: '2 Player', sub: '40 stages · 2 cats' },
  { id: '3p', label: '3 Player', sub: '40 stages · 3 cats' },
  { id: '4p', label: '4 Player', sub: '40 stages · 4 cats' },
  { id: '5p', label: '5 Player', sub: '40 stages · 5 cats' },
  { id: '6p', label: '6+ Player', sub: '40 stages · 6 cats' },
];

function getDifficultyTierLabel(stageNum: number): string {
  const tier = Math.min(10, Math.max(1, Math.ceil(stageNum / 4)));
  return `Tier ${tier}`;
}

export function StageSelectModal({
  localCoopMode,
  onChangeLocalMode,
  onSelectStage,
  onClose,
}: StageSelectModalProps) {
  const [selectedBracket, setSelectedBracket] = useState<PlayerBracket>('2p');
  const stages = getLevelsByBracket(selectedBracket);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select Stage"
        className="w-full max-w-2xl max-h-[90dvh] flex flex-col bg-white border-[3px] border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-neutral-200 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-[#1A1A1A]">
              Stages &amp; Player-Count Modes
            </h2>
            <p className="text-xs text-neutral-600">
              40 escalating stages per mode (200 total) · Switch cats with Tab / SWAP
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Stage Select"
            className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] bg-white hover:bg-neutral-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Local Control Mode Toggle */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChangeLocalMode('solo-switch')}
            className={`flex-1 min-w-[160px] px-3 py-2 text-left border-2 cursor-pointer ${
              localCoopMode === 'solo-switch'
                ? 'bg-orange-50 border-[#F48C42]'
                : 'bg-white border-neutral-300 hover:border-[#1A1A1A]'
            }`}
          >
            <div className="text-sm font-bold text-[#1A1A1A]">Solo Multi-Cat [Tab / SWAP]</div>
            <div className="text-xs text-neutral-600">Control 2 to 6 cats one by one</div>
          </button>
          <button
            type="button"
            onClick={() => onChangeLocalMode('2p-shared')}
            className={`flex-1 min-w-[160px] px-3 py-2 text-left border-2 cursor-pointer ${
              localCoopMode === '2p-shared'
                ? 'bg-orange-50 border-[#F48C42]'
                : 'bg-white border-neutral-300 hover:border-[#1A1A1A]'
            }`}
          >
            <div className="text-sm font-bold text-[#1A1A1A]">2P Shared Keyboard</div>
            <div className="text-xs text-neutral-600">P1: WASD · P2: Arrows (+Tab extra)</div>
          </button>
        </div>

        {/* Player-Count Bracket Tabs */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {LOCAL_BRACKETS.map((b) => {
            const active = selectedBracket === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBracket(b.id)}
                className={`px-2.5 py-2 text-left border-2 cursor-pointer ${
                  active
                    ? 'bg-[#F48C42] text-white border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A]'
                    : 'bg-neutral-50 text-[#1A1A1A] border-neutral-300 hover:border-[#1A1A1A]'
                }`}
              >
                <div className="text-xs sm:text-sm font-extrabold whitespace-nowrap">{b.label}</div>
                <div className={`text-[11px] whitespace-nowrap ${active ? 'text-white/90' : 'text-neutral-600'}`}>
                  {b.sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Stages Grid (scrollable 40 stages per bracket while tabs stay visible above) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1 min-h-0 flex-1">
          {stages.map((lvl) => (
            <button
              key={lvl.index}
              type="button"
              onClick={() => onSelectStage(lvl.index)}
              className="p-3.5 text-left bg-white hover:bg-orange-50/70 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] cursor-pointer transition-transform active:translate-y-0.5"
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase text-[#F48C42]">
                <span>
                  {selectedBracket.toUpperCase()} · Stage {String(lvl.stageNumber).padStart(2, '0')}
                </span>
                <span className="text-[#1A1A1A]">
                  {getDifficultyTierLabel(lvl.stageNumber)}
                  {lvl.tetheredRope ? ' · Rope' : ''}
                  {lvl.lasers && lvl.lasers.length > 0 ? ' · Laser' : ''}
                  {lvl.springs && lvl.springs.length > 0 ? ' · Spring' : ''} · {lvl.recommendedPlayers} Cats
                </span>
              </div>
              <div className="mt-0.5 font-extrabold text-base text-[#1A1A1A]">{lvl.name}</div>
              <p className="mt-1 text-xs text-neutral-600 line-clamp-2">{lvl.hint}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
