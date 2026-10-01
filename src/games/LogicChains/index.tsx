import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'logic-chains';
const CATEGORY = 'problem-solving';

type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond';
type ColorType = 'red' | 'blue' | 'green' | 'yellow';

interface Shape {
  type: ShapeType;
  color: ColorType;
  rotation?: number;
}

const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond'];
const COLORS: ColorType[] = ['red', 'blue', 'green', 'yellow'];

const COLOR_MAP: Record<ColorType, string> = {
  red: '#fa5252',
  blue: '#339af0',
  green: '#51cf66',
  yellow: '#fcc419'
};

const ShapeRenderer = ({ shape, size = 40 }: { shape: Shape, size?: number }) => {
  const color = COLOR_MAP[shape.color];
  const rot = shape.rotation || 0;
  
  const style = { transform: `rotate(${rot}deg)` };

  switch (shape.type) {
    case 'circle':
      return <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: color, ...style }} />;
    case 'square':
      return <div style={{ width: size, height: size, backgroundColor: color, borderRadius: size * 0.15, ...style }} />;
    case 'triangle':
      return (
        <div style={{
          width: 0, height: 0,
          borderLeft: `${size / 2}px solid transparent`,
          borderRight: `${size / 2}px solid transparent`,
          borderBottom: `${size}px solid ${color}`,
          ...style
        }} />
      );
    case 'diamond':
      return (
        <div style={{ width: size * 0.8, height: size * 0.8, backgroundColor: color, transform: `rotate(${45 + rot}deg)`, borderRadius: size * 0.1 }} />
      );
  }
};

export default function LogicChains() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 12,
    baseScore: 100,
    targetReactionTime: 3000,
  });

  const { state, round, totalRounds, score, streak, difficulty, countdown, startGame, startCountdown, recordCorrect, recordIncorrect, nextRound, endGame, pauseGame, resumeGame, resetGame, restartGame, session: finalSession } = session;

  const [sequence, setSequence] = useState<Shape[]>([]);
  const [options, setOptions] = useState<Shape[]>([]);
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);

  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startNewRound = useCallback(() => {
    const params = getDifficultyParams(difficulty);
    const seqLength = params.patternComplexity || 3; 
    
    // Determine pattern rule
    // 0: simple color alternation
    // 1: simple shape alternation
    // 2: shape + color shift
    // 3: rotation
    const ruleTypes = [0, 1, 2, 3].slice(0, difficulty);
    const rule = ruleTypes[Math.floor(Math.random() * ruleTypes.length)];
    
    const newSeq: Shape[] = [];
    let baseColorIdx = Math.floor(Math.random() * COLORS.length);
    let baseShapeIdx = Math.floor(Math.random() * SHAPES.length);
    
    for (let i = 0; i < seqLength + 1; i++) {
      if (rule === 0) {
        newSeq.push({ type: SHAPES[baseShapeIdx], color: COLORS[(baseColorIdx + i) % COLORS.length] });
      } else if (rule === 1) {
        newSeq.push({ type: SHAPES[(baseShapeIdx + i) % SHAPES.length], color: COLORS[baseColorIdx] });
      } else if (rule === 2) {
        newSeq.push({ type: SHAPES[(baseShapeIdx + i) % SHAPES.length], color: COLORS[(baseColorIdx + i) % COLORS.length] });
      } else if (rule === 3) {
        newSeq.push({ type: 'triangle', color: COLORS[baseColorIdx], rotation: i * 90 });
      }
    }
    
    const displaySeq = newSeq.slice(0, seqLength);
    const answer = newSeq[seqLength];
    
    // Generate distractors
    const newOptions: Shape[] = [{ ...answer }];
    let attempts = 0;
    while (newOptions.length < 4 && attempts < 50) {
      attempts++;
      const distractor: Shape = {
        type: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: rule === 3 ? Math.floor(Math.random() * 4) * 90 : 0
      };
      
      const exists = newOptions.some(o => o.type === distractor.type && o.color === distractor.color && (o.rotation || 0) === (distractor.rotation || 0));
      if (!exists) {
        newOptions.push(distractor);
      }
    }
    
    // Fallback if not enough unique combinations
    while (newOptions.length < 4) {
      newOptions.push({
        type: SHAPES[newOptions.length % SHAPES.length],
        color: COLORS[(baseColorIdx + newOptions.length) % COLORS.length],
        rotation: (newOptions.length * 90) % 360
      });
    }

    // Shuffle options using Fisher-Yates
    const shuffled = [...newOptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const correctIdx = shuffled.findIndex(o => 
      o.type === answer.type && 
      o.color === answer.color && 
      (o.rotation || 0) === (answer.rotation || 0)
    );
    
    setSequence(displaySeq);
    setOptions(shuffled);
    setCorrectOptionIdx(Math.max(0, correctIdx));
    setSelectedIdx(null);
    setStartTime(Date.now());
  }, [difficulty]);

  useEffect(() => {
    if (state === 'playing') {
      startNewRound();
    }
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, [state, round, startNewRound]);

  const handleOptionClick = (index: number) => {
    if (selectedIdx !== null) return;
    
    setSelectedIdx(index);
    const reactionTime = Date.now() - startTime;
    
    if (index === correctOptionIdx) {
      recordCorrect(reactionTime);
    } else {
      recordIncorrect(reactionTime);
    }
    
    resultTimeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 1000);
  };

  const renderGameContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Logic Chains"
          description="Identify the pattern and select the next shape."
          instructions={[
            "Look at the sequence of shapes.",
            "Determine the logical rule.",
            "Select the correct next shape from the options."
          ]}
          category={CATEGORY}
          difficulty={difficulty}
          onStart={startCountdown}
        />
      );
    }

    if (state === 'countdown') return <GameCountdown count={countdown} category={CATEGORY} />;
    if (state === 'results' && finalSession) return <GameResults session={finalSession} onPlayAgain={restartGame} onBackToMenu={resetGame} />;

    return (
      <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-[var(--color-surface-200)] w-full mb-12">
          <h3 className="text-center text-[var(--color-surface-500)] font-bold uppercase tracking-wider mb-8">What comes next?</h3>
          <div className="flex items-center justify-center gap-6">
            {sequence.map((shape, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="w-20 h-20 bg-[var(--color-surface-50)] rounded-xl flex items-center justify-center animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <ShapeRenderer shape={shape} size={48} />
                </div>
                <div className="text-[var(--color-surface-300)] font-bold text-2xl">→</div>
              </div>
            ))}
            <div className="w-20 h-20 bg-[var(--color-surface-100)] border-2 border-dashed border-[var(--color-surface-300)] rounded-xl flex items-center justify-center animate-pulse">
              <span className="text-3xl text-[var(--color-surface-400)] font-bold">?</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {options.map((option, i) => {
            let bgClass = 'bg-white hover:bg-[var(--color-surface-50)] border-[var(--color-surface-200)]';
            if (selectedIdx !== null) {
              if (i === correctOptionIdx) bgClass = 'bg-[var(--color-success-50)] border-[var(--color-success-400)] scale-105 shadow-md';
              else if (i === selectedIdx) bgClass = 'bg-[var(--color-error-50)] border-[var(--color-error-400)] opacity-70';
              else bgClass = 'bg-white border-[var(--color-surface-200)] opacity-50';
            }
            
            return (
              <button
                key={i}
                onClick={() => handleOptionClick(i)}
                disabled={selectedIdx !== null}
                className={`h-32 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ${bgClass} ${selectedIdx === null ? 'active:scale-95 shadow-sm' : ''}`}
              >
                <ShapeRenderer shape={option} size={48} />
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
      <div className="flex-1 flex flex-col justify-center items-center">
        {renderGameContent()}
      </div>
      {state === 'paused' && <GamePause onResume={resumeGame} onQuit={resetGame} />}
    </div>
  );
}
