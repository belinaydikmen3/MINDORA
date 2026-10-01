import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'echo-recall';
const CATEGORY = 'memory';

interface NodeConfig {
  id: number;
  freq: number;
  color: string;
  name: string;
  note: string;
}

const CHIME_NODES: NodeConfig[] = [
  { id: 0, freq: 261.63, color: '#845ef7', name: 'Lavender', note: 'C4' },
  { id: 1, freq: 329.63, color: '#10b981', name: 'Mint', note: 'E4' },
  { id: 2, freq: 392.0, color: '#f59e0b', name: 'Amber', note: 'G4' },
  { id: 3, freq: 493.88, color: '#f43f5e', name: 'Coral', note: 'B4' },
];

let echoAudioCtx: AudioContext | null = null;
function playEchoChime(freq: number) {
  try {
    if (!echoAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) echoAudioCtx = new AudioContextClass();
    }
    if (!echoAudioCtx) return;
    if (echoAudioCtx.state === 'suspended') echoAudioCtx.resume().catch(() => {});

    const osc = echoAudioCtx.createOscillator();
    const gain = echoAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, echoAudioCtx.currentTime);

    gain.gain.setValueAtTime(0.18, echoAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, echoAudioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(echoAudioCtx.destination);
    osc.start();
    osc.stop(echoAudioCtx.currentTime + 0.35);
  } catch {
    // audio fallback
  }
}

export default function EchoRecall() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 10,
    baseScore: 130,
    targetReactionTime: 2000,
  });

  const {
    state,
    round,
    totalRounds,
    score,
    streak,
    difficulty,
    countdown,
    startCountdown,
    recordCorrect,
    recordIncorrect,
    nextRound,
    endGame,
    pauseGame,
    resumeGame,
    resetGame,
    restartGame,
    session: finalSession,
  } = session;

  const [sequence, setSequence] = useState<number[]>([]);
  const [expectedInput, setExpectedInput] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [phase, setPhase] = useState<'observing' | 'input' | 'feedback'>('observing');
  const [isReverseMode, setIsReverseMode] = useState(false);
  const [startTime, setStartTime] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startNewRound = useCallback(() => {
    const params = getDifficultyParams(difficulty);
    // Sequence length: 3 at diff 1, up to 6 at diff 5
    const seqLen = Math.min(3 + Math.floor(difficulty * 0.7), 6);
    const reverse = round > 5; // Rounds 6-10 reverse recall

    const newSeq: number[] = [];
    for (let i = 0; i < seqLen; i++) {
      newSeq.push(Math.floor(Math.random() * 4));
    }

    const expected = reverse ? [...newSeq].reverse() : [...newSeq];

    setSequence(newSeq);
    setExpectedInput(expected);
    setUserInput([]);
    setIsReverseMode(reverse);
    setPhase('observing');
    setActivePad(null);

    // Playback sequence
    const intervalTime = Math.max(380, 600 - difficulty * 40);
    newSeq.forEach((padId, stepIndex) => {
      setTimeout(() => {
        setActivePad(padId);
        playEchoChime(CHIME_NODES[padId].freq);
        setTimeout(() => setActivePad(null), intervalTime * 0.7);
      }, (stepIndex + 1) * intervalTime);
    });

    // Switch to input phase
    const totalPlayTime = (newSeq.length + 1) * intervalTime + 200;
    timeoutRef.current = setTimeout(() => {
      setPhase('input');
      setStartTime(Date.now());
    }, totalPlayTime);
  }, [difficulty, round]);

  useEffect(() => {
    if (state === 'playing') {
      startNewRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, round, startNewRound]);

  const handlePadPress = (padId: number) => {
    if (phase !== 'input') return;

    setActivePad(padId);
    playEchoChime(CHIME_NODES[padId].freq);
    setTimeout(() => setActivePad(null), 200);

    const nextUser = [...userInput, padId];
    setUserInput(nextUser);

    const stepIdx = nextUser.length - 1;
    if (nextUser[stepIdx] !== expectedInput[stepIdx]) {
      // Mistake made
      setPhase('feedback');
      recordIncorrect();
      timeoutRef.current = setTimeout(() => {
        if (round >= totalRounds) endGame();
        else nextRound();
      }, 1000);
      return;
    }

    // If whole sequence completed correctly
    if (nextUser.length === expectedInput.length) {
      setPhase('feedback');
      const reactionTime = Date.now() - startTime;
      recordCorrect(reactionTime);
      timeoutRef.current = setTimeout(() => {
        if (round >= totalRounds) endGame();
        else nextRound();
      }, 1000);
    }
  };

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Echo Recall"
          description="Memorize the harmonic sequence of chime nodes and echo it back in direct or reverse order."
          instructions={[
            'Watch and listen as the resonance chime pads illuminate.',
            'Memorize the tone and position sequence.',
            'Reproduce the sequence by tapping the pads.',
            'Notice rule changes: later rounds challenge reverse recall!',
          ]}
          category={CATEGORY}
          difficulty={difficulty}
          onStart={startCountdown}
        />
      );
    }

    if (state === 'countdown') return <GameCountdown count={countdown} category={CATEGORY} />;
    if (state === 'results' && finalSession) {
      return <GameResults session={finalSession} onPlayAgain={restartGame} onBackToMenu={resetGame} />;
    }

    return (
      <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto p-4 py-8">
        {/* Status Mode Banner */}
        <div className="mb-8 text-center">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isReverseMode
                ? 'bg-[var(--color-mindora-coral)]/15 text-[var(--color-mindora-coral)]'
                : 'bg-[var(--color-mindora-lavender)]/20 text-[var(--color-brand-800)]'
            }`}
          >
            {isReverseMode ? '⟲ REVERSE RECALL MODE' : '⟳ DIRECT RECALL MODE'}
          </span>
          <p className="text-xs text-[var(--color-mindora-slate)] mt-2">
            {phase === 'observing'
              ? 'Listen and observe the chime sequence...'
              : phase === 'input'
              ? `Echo back the ${expectedInput.length} notes (${userInput.length}/${expectedInput.length})`
              : 'Verifying echo...'}
          </p>
        </div>

        {/* 4 Chime Pads Grid */}
        <div className="grid grid-cols-2 gap-5 w-full aspect-square max-w-[340px] mb-8">
          {CHIME_NODES.map((node) => {
            const isLit = activePad === node.id;
            return (
              <button
                key={node.id}
                onClick={() => handlePadPress(node.id)}
                disabled={phase !== 'input'}
                className={`rounded-3xl transition-all duration-150 flex flex-col items-center justify-center relative cursor-pointer active:scale-95 border-2 ${
                  isLit
                    ? 'scale-105 shadow-lg'
                    : 'bg-white hover:border-[var(--color-surface-400)] border-[var(--color-surface-200)] shadow-xs'
                }`}
                style={{
                  backgroundColor: isLit ? node.color : undefined,
                  borderColor: isLit ? node.color : undefined,
                  boxShadow: isLit ? `0 0 25px ${node.color}80` : undefined,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono transition-colors"
                  style={{
                    backgroundColor: isLit ? 'white' : `${node.color}15`,
                    color: isLit ? node.color : node.color,
                  }}
                >
                  {node.note}
                </div>
                <span className={`text-[11px] font-semibold mt-2 ${isLit ? 'text-white' : 'text-[var(--color-mindora-slate)]'}`}>
                  {node.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* User Progress Dots */}
        <div className="flex gap-2">
          {expectedInput.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < userInput.length
                  ? 'bg-[var(--color-mindora-ink)] scale-110'
                  : 'bg-[var(--color-surface-200)]'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-50)]">
      {(state === 'playing' || state === 'paused') && (
        <GameHUD round={round} totalRounds={totalRounds} score={score} streak={streak} category={CATEGORY} onPause={pauseGame} />
      )}
      <div className="flex-1 flex flex-col justify-center items-center w-full">{renderContent()}</div>
      {state === 'paused' && <GamePause onResume={resumeGame} onQuit={resetGame} />}
    </div>
  );
}
