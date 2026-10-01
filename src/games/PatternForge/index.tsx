import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'pattern-forge';
const CATEGORY = 'problem-solving';

type GlyphShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon';
const GLYPH_SHAPES: GlyphShape[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon'];

const GLYPH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

interface Glyph {
  shape: GlyphShape;
  color: string;
  dots: number;
  rotation: number;
}

function renderGlyphSVG(glyph: Glyph, size = 64) {
  const center = size / 2;
  const rad = size * 0.38;

  const shapeElements = () => {
    switch (glyph.shape) {
      case 'circle':
        return <circle cx={center} cy={center} r={rad} fill={glyph.color} fillOpacity="0.25" stroke={glyph.color} strokeWidth="2.5" />;
      case 'square':
        return (
          <rect
            x={center - rad}
            y={center - rad}
            width={rad * 2}
            height={rad * 2}
            rx={size * 0.1}
            fill={glyph.color}
            fillOpacity="0.25"
            stroke={glyph.color}
            strokeWidth="2.5"
          />
        );
      case 'triangle': {
        const h = rad * 1.7;
        const pts = `${center},${center - rad} ${center - rad},${center + h - rad} ${center + rad},${center + h - rad}`;
        return <polygon points={pts} fill={glyph.color} fillOpacity="0.25" stroke={glyph.color} strokeWidth="2.5" strokeLinejoin="round" />;
      }
      case 'diamond': {
        const pts = `${center},${center - rad} ${center + rad},${center} ${center},${center + rad} ${center - rad},${center}`;
        return <polygon points={pts} fill={glyph.color} fillOpacity="0.25" stroke={glyph.color} strokeWidth="2.5" strokeLinejoin="round" />;
      }
      case 'hexagon': {
        const pts = [0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i * 60 * Math.PI) / 180;
          return `${center + rad * Math.cos(a)},${center + rad * Math.sin(a)}`;
        }).join(' ');
        return <polygon points={pts} fill={glyph.color} fillOpacity="0.25" stroke={glyph.color} strokeWidth="2.5" strokeLinejoin="round" />;
      }
    }
  };

  const dotElements = () => {
    const dotR = Math.max(2, size * 0.05);
    const dots = [];
    if (glyph.dots === 1) {
      dots.push(<circle key="d1" cx={center} cy={center} r={dotR} fill={glyph.color} />);
    } else if (glyph.dots === 2) {
      dots.push(<circle key="d1" cx={center - dotR * 2.5} cy={center} r={dotR} fill={glyph.color} />);
      dots.push(<circle key="d2" cx={center + dotR * 2.5} cy={center} r={dotR} fill={glyph.color} />);
    } else if (glyph.dots === 3) {
      dots.push(<circle key="d1" cx={center} cy={center - dotR * 2.5} r={dotR} fill={glyph.color} />);
      dots.push(<circle key="d2" cx={center - dotR * 2.5} cy={center + dotR * 2} r={dotR} fill={glyph.color} />);
      dots.push(<circle key="d3" cx={center + dotR * 2.5} cy={center + dotR * 2} r={dotR} fill={glyph.color} />);
    } else if (glyph.dots === 4) {
      dots.push(<circle key="d1" cx={center - dotR * 2} cy={center - dotR * 2} r={dotR} fill={glyph.color} />);
      dots.push(<circle key="d2" cx={center + dotR * 2} cy={center - dotR * 2} r={dotR} fill={glyph.color} />);
      dots.push(<circle key="d3" cx={center - dotR * 2} cy={center + dotR * 2} r={dotR} fill={glyph.color} />);
      dots.push(<circle key="d4" cx={center + dotR * 2} cy={center + dotR * 2} r={dotR} fill={glyph.color} />);
    }
    return dots;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: `rotate(${glyph.rotation}deg)`, transition: 'transform 0.2s ease' }}
    >
      {shapeElements()}
      {dotElements()}
    </svg>
  );
}

export default function PatternForge() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 12,
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

  const [sequence, setSequence] = useState<Glyph[]>([]);
  const [options, setOptions] = useState<Glyph[]>([]);
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(-1);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);

  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const generateRound = useCallback(() => {
    const params = getDifficultyParams(difficulty);
    const seqLength = Math.min(3 + Math.floor(difficulty / 2), 5); // 3, 3, 4, 4, 5 items

    const baseShapeIdx = Math.floor(Math.random() * GLYPH_SHAPES.length);
    const baseColorIdx = Math.floor(Math.random() * GLYPH_COLORS.length);
    const baseDots = 1 + Math.floor(Math.random() * 2);
    const baseRot = [0, 90, 180, 270][Math.floor(Math.random() * 4)];

    // Transformation rules based on difficulty
    const rotateStep = difficulty >= 2 ? (Math.random() > 0.5 ? 90 : -90) : 0;
    const dotStep = difficulty >= 3 ? 1 : 0;
    const shapeStep = difficulty >= 4 ? 1 : (difficulty === 1 ? 1 : 0);
    const colorStep = difficulty >= 5 ? 1 : 0;

    const fullSeq: Glyph[] = [];
    for (let i = 0; i <= seqLength; i++) {
      fullSeq.push({
        shape: GLYPH_SHAPES[(baseShapeIdx + i * shapeStep) % GLYPH_SHAPES.length],
        color: GLYPH_COLORS[(baseColorIdx + i * colorStep) % GLYPH_COLORS.length],
        dots: Math.min(4, Math.max(1, ((baseDots - 1 + i * dotStep) % 4) + 1)),
        rotation: (baseRot + i * rotateStep + 360) % 360,
      });
    }

    const displayedSeq = fullSeq.slice(0, seqLength);
    const answer = fullSeq[seqLength];

    // Generate 3 plausible distractors
    const distractors: Glyph[] = [];
    let attempts = 0;
    while (distractors.length < 3 && attempts < 50) {
      attempts++;
      const candidate: Glyph = {
        shape: Math.random() > 0.4 ? answer.shape : GLYPH_SHAPES[Math.floor(Math.random() * GLYPH_SHAPES.length)],
        color: Math.random() > 0.5 ? answer.color : GLYPH_COLORS[Math.floor(Math.random() * GLYPH_COLORS.length)],
        dots: Math.random() > 0.5 ? answer.dots : 1 + Math.floor(Math.random() * 4),
        rotation: Math.random() > 0.5 ? answer.rotation : [0, 90, 180, 270][Math.floor(Math.random() * 4)],
      };

      const isExactAnswer =
        candidate.shape === answer.shape &&
        candidate.color === answer.color &&
        candidate.dots === answer.dots &&
        candidate.rotation === answer.rotation;

      const isDuplicate = distractors.some(
        (d) =>
          d.shape === candidate.shape &&
          d.color === candidate.color &&
          d.dots === candidate.dots &&
          d.rotation === candidate.rotation
      );

      if (!isExactAnswer && !isDuplicate) {
        distractors.push(candidate);
      }
    }

    // Fallbacks if loop didn't fill 3
    while (distractors.length < 3) {
      distractors.push({
        shape: GLYPH_SHAPES[(baseShapeIdx + distractors.length + 1) % GLYPH_SHAPES.length],
        color: GLYPH_COLORS[(baseColorIdx + distractors.length + 1) % GLYPH_COLORS.length],
        dots: ((answer.dots + distractors.length) % 4) + 1,
        rotation: (answer.rotation + 90 * (distractors.length + 1)) % 360,
      });
    }

    const allOptions = [answer, ...distractors].sort(() => Math.random() - 0.5);
    const correctIdx = allOptions.findIndex(
      (o) =>
        o.shape === answer.shape &&
        o.color === answer.color &&
        o.dots === answer.dots &&
        o.rotation === answer.rotation
    );

    setSequence(displayedSeq);
    setOptions(allOptions);
    setCorrectOptionIdx(correctIdx);
    setSelectedIdx(null);
    setStartTime(Date.now());
  }, [difficulty]);

  useEffect(() => {
    if (state === 'playing') {
      generateRound();
    }
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, [state, round, generateRound]);

  const handleSelect = (index: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(index);
    const reactionTime = Date.now() - startTime;
    const isCorrect = index === correctOptionIdx;

    if (isCorrect) {
      recordCorrect(reactionTime);
    } else {
      recordIncorrect(reactionTime);
    }

    resultTimeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 900);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state !== 'playing' || selectedIdx !== null) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        handleSelect(parseInt(e.key, 10) - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Pattern Forge"
          description="Analyze the evolving glyph matrix and determine the next logical sequence element."
          instructions={[
            'Observe the sequential transformation across the pattern chain.',
            'Track shape changes, orientation shifts, and inner markers.',
            'Select the matching candidate to complete the chain.',
            'Use number keys 1–4 or tap to submit.',
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
      <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto p-4 py-8">
        {/* Sequence Display Box */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[var(--color-surface-200)] mb-8 flex flex-col items-center">
          <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-4">
            Sequence Chain ({sequence.length} Steps)
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            {sequence.map((glyph, i) => (
              <React.Fragment key={i}>
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--color-surface-50)] rounded-xl border border-[var(--color-surface-200)] flex items-center justify-center shadow-xs">
                  {renderGlyphSVG(glyph, 54)}
                </div>
                <span className="text-[var(--color-surface-300)] font-mono text-sm sm:text-base">→</span>
              </React.Fragment>
            ))}

            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--color-mindora-lavender)]/10 rounded-xl border-2 border-dashed border-[var(--color-mindora-lavender)] flex items-center justify-center text-2xl font-bold text-[var(--color-brand-800)]">
              ?
            </div>
          </div>
        </div>

        {/* 4 Candidate Options */}
        <div className="w-full max-w-xl grid grid-cols-2 gap-4">
          {options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isCorrect = idx === correctOptionIdx;
            const showFeedback = selectedIdx !== null;

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
                onClick={() => handleSelect(idx)}
                disabled={selectedIdx !== null}
                className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative cursor-pointer active:scale-95 ${cardStyle}`}
              >
                <span className="absolute top-2 left-3 text-[10px] font-mono text-[var(--color-mindora-slate)] font-bold">
                  [{idx + 1}]
                </span>
                {renderGlyphSVG(opt, 58)}
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
