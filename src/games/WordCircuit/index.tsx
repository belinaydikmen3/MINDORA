import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'word-circuit';
const CATEGORY = 'problem-solving';

interface AnalogyItem {
  promptA: string;
  promptB: string;
  targetA: string;
  correctAnswer: string;
  distractors: string[];
  relationship: string;
}

const ANALOGY_BANK: AnalogyItem[] = [
  { promptA: 'LIGHT', promptB: 'SHADOW', targetA: 'SOUND', correctAnswer: 'ECHO', distractors: ['SILENCE', 'VIBRATION', 'MUSIC'], relationship: 'Reflection / Secondary phenomenon' },
  { promptA: 'COMPASS', promptB: 'NAVIGATION', targetA: 'CLOCK', correctAnswer: 'CHRONOLOGY', distractors: ['PENDULUM', 'HOUR', 'WATCH'], relationship: 'Measurement domain' },
  { promptA: 'OASIS', promptB: 'DESERT', targetA: 'ISLAND', correctAnswer: 'OCEAN', distractors: ['BEACH', 'PALM', 'WATER'], relationship: 'Isolated enclave within vast expanse' },
  { promptA: 'ARCHITECT', promptB: 'BLUEPRINT', targetA: 'COMPOSER', correctAnswer: 'SCORE', distractors: ['SYMPHONY', 'PIANO', 'CONCERT'], relationship: 'Author to structured notation' },
  { promptA: 'SEED', promptB: 'TREE', targetA: 'IDEA', correctAnswer: 'INVENTION', distractors: ['MIND', 'THOUGHT', 'CREATIVITY'], relationship: 'Origin to mature realization' },
  { promptA: 'TELESCOPE', promptB: 'CONSTELLATION', targetA: 'MICROSCOPE', correctAnswer: 'CELL', distractors: ['LENS', 'BACTERIA', 'LABORATORY'], relationship: 'Observation tool to target scale' },
  { promptA: 'CANVAS', promptB: 'PAINTING', targetA: 'MARBLE', correctAnswer: 'SCULPTURE', distractors: ['STONE', 'CHISEL', 'STATUE'], relationship: 'Raw substrate to finished art' },
  { promptA: 'CATALYST', promptB: 'REACTION', targetA: 'SPARK', correctAnswer: 'COMBUSTION', distractors: ['FLAME', 'HEAT', 'SMOKE'], relationship: 'Initiator to dynamic event' },
  { promptA: 'PRISM', promptB: 'SPECTRUM', targetA: 'DICTIONARY', correctAnswer: 'VOCABULARY', distractors: ['BOOK', 'DEFINITION', 'GRAMMAR'], relationship: 'Refractor to comprehensive elements' },
  { promptA: 'ROOT', promptB: 'ANCHOR', targetA: 'WING', correctAnswer: 'LIFT', distractors: ['FEATHER', 'FLIGHT', 'BIRD'], relationship: 'Anatomical organ to physical function' },
  { promptA: 'CHESS', promptB: 'STRATEGY', targetA: 'POETRY', correctAnswer: 'METAPHOR', distractors: ['RHYME', 'STANZA', 'PROSE'], relationship: 'Artform to foundational device' },
  { promptA: 'ALLOY', promptB: 'METAL', targetA: 'SYNTHESIS', correctAnswer: 'CONCEPT', distractors: ['CHEMICAL', 'ELEMENT', 'MIXTURE'], relationship: 'Compound to constituent ideas' },
  { promptA: 'EPILOGUE', promptB: 'NOVEL', targetA: 'CODA', correctAnswer: 'SYMPHONY', distractors: ['MUSIC', 'TEMPO', 'OVERTURE'], relationship: 'Concluding structural movement' },
  { promptA: 'GRAVITY', promptB: 'ORBIT', targetA: 'MAGNETISM', correctAnswer: 'POLARITY', distractors: ['ATTRACTION', 'FIELD', 'FORCE'], relationship: 'Governing force to spatial outcome' },
  { promptA: 'HARBOR', promptB: 'VESSEL', targetA: 'NEST', correctAnswer: 'FLEDGLING', distractors: ['TREE', 'FEATHER', 'BIRD'], relationship: 'Protected sanctuary to occupant' },
];

export default function WordCircuit() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 10,
    baseScore: 120,
    targetReactionTime: 2500,
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

  const [currentAnalogy, setCurrentAnalogy] = useState<AnalogyItem | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initRound = useCallback(() => {
    // Pick an analogy item based on round and difficulty
    const bankIndex = (round - 1 + difficulty * 2) % ANALOGY_BANK.length;
    const item = ANALOGY_BANK[bankIndex];

    const allOpts = [item.correctAnswer, ...item.distractors].sort(() => Math.random() - 0.5);

    setCurrentAnalogy(item);
    setOptions(allOpts);
    setSelectedWord(null);
    setStartTime(Date.now());
  }, [difficulty, round]);

  useEffect(() => {
    if (state === 'playing') {
      initRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, round, initRound]);

  const handleSelect = (word: string) => {
    if (selectedWord !== null || !currentAnalogy) return;

    setSelectedWord(word);
    const reactionTime = Date.now() - startTime;
    const isCorrect = word === currentAnalogy.correctAnswer;

    if (isCorrect) {
      recordCorrect(reactionTime);
    } else {
      recordIncorrect(reactionTime);
    }

    timeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 900);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state !== 'playing' || selectedWord !== null) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (options[idx]) handleSelect(options[idx]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Word Circuit"
          description="Decipher conceptual analogies and semantic relationships across diverse cognitive disciplines."
          instructions={[
            'Review the primary relational pair: [Word A] is to [Word B].',
            'Identify the conceptual dimension binding them.',
            'Select the target word that completes the analogy for [Word C].',
            'Press keys 1–4 or tap candidate cards.',
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
    if (!currentAnalogy) return null;

    return (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-4 py-8">
        {/* Analogy Formula Card */}
        <div className="w-full bg-white p-7 sm:p-10 rounded-2xl shadow-sm border border-[var(--color-surface-200)] mb-8 text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-mindora-slate)] mb-6 block">
            Conceptual Analogy
          </span>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-lg sm:text-xl font-serif">
            {/* Primary Pair */}
            <div className="flex items-center gap-2 font-bold text-[var(--color-mindora-ink)]">
              <span>{currentAnalogy.promptA}</span>
              <span className="text-xs text-[var(--color-mindora-slate)] font-mono font-normal">is to</span>
              <span>{currentAnalogy.promptB}</span>
            </div>

            <span className="text-[var(--color-mindora-lavender)] font-bold text-2xl hidden sm:inline">::</span>

            {/* Target Pair */}
            <div className="flex items-center gap-2 font-bold text-[var(--color-mindora-ink)]">
              <span>{currentAnalogy.targetA}</span>
              <span className="text-xs text-[var(--color-mindora-slate)] font-mono font-normal">is to</span>
              <span className="text-[var(--color-brand-800)] px-3 py-1 bg-[var(--color-mindora-lavender)]/20 rounded-lg border border-[var(--color-mindora-lavender)]">
                ?
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--color-surface-100)] text-xs text-[var(--color-mindora-slate)]">
            Relational Axis: {currentAnalogy.relationship}
          </div>
        </div>

        {/* 4 Candidate Options */}
        <div className="w-full max-w-xl grid grid-cols-2 gap-4">
          {options.map((opt, idx) => {
            const isSelected = selectedWord === opt;
            const isCorrect = opt === currentAnalogy.correctAnswer;
            const showFeedback = selectedWord !== null;

            let cardStyle = 'bg-white hover:border-[var(--color-mindora-lavender)] hover:shadow-xs';
            if (showFeedback) {
              if (isSelected && isCorrect) cardStyle = 'bg-[var(--color-success-50)] border-[var(--color-success-500)] ring-2 ring-[var(--color-success-500)]';
              else if (isSelected && !isCorrect) cardStyle = 'bg-[var(--color-error-50)] border-[var(--color-error-500)] ring-2 ring-[var(--color-error-500)]';
              else if (isCorrect) cardStyle = 'bg-[var(--color-success-50)] border-[var(--color-success-500)]';
              else cardStyle = 'opacity-40 border-[var(--color-surface-200)]';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt)}
                disabled={selectedWord !== null}
                className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative cursor-pointer active:scale-95 ${cardStyle}`}
              >
                <span className="absolute top-2 left-3 text-[10px] font-mono text-[var(--color-mindora-slate)] font-bold">
                  [{idx + 1}]
                </span>
                <span className="text-base sm:text-lg font-bold text-[var(--color-mindora-ink)] tracking-wide">
                  {opt}
                </span>
              </button>
            );
          })}
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
