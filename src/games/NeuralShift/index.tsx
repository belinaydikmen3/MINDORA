import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import type { DifficultyLevel } from '../../types';

// Icons (using generic SVG since lucide-react might have specific imports)
const BrainIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5A3 3 0 0 0 13.6 4.4"/><path d="M6.401 6.5A3 3 0 0 1 10.4 4.4"/></svg>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>;
const RotateCcwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;

// --- Types ---
type RuleType = 'REPEAT' | 'REVERSE' | 'SKIP' | 'COLOR' | 'SHIFT';
type GamePhase = 'show_path' | 'show_rule' | 'player_turn' | 'feedback';

interface NodeData {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  isDistractor: boolean;
}

// --- Constants ---
const COLORS = ['#5c7cfa', '#ff922b', '#51cf66', '#f06595', '#22b8cf', '#FCC419'];
const BASE_COLOR = '#5c7cfa';
const DISTRACTOR_COLOR = '#fa5252';

const RULE_DESCRIPTIONS: Record<RuleType, string> = {
  REPEAT: 'REPRODUCE THE PATH',
  REVERSE: 'REPRODUCE IN REVERSE',
  SKIP: 'IGNORE THE RED NODE',
  COLOR: 'MATCH THE COLOR SEQUENCE',
  SHIFT: 'NODES HAVE SHIFTED - REPRODUCE PATH',
};

// --- Helpers ---
const distance = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

const generateNodes = (count: number, width: number, height: number): NodeData[] => {
  const nodes: NodeData[] = [];
  const padding = 60;
  const safeWidth = width - padding * 2;
  const safeHeight = height - padding * 2;
  
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
      x = padding + Math.random() * safeWidth;
      y = padding + Math.random() * safeHeight;
      valid = true;
      for (const n of nodes) {
        if (distance(x, y, n.targetX, n.targetY) < 80) {
          valid = false;
          break;
        }
      }
      attempts++;
    }
    nodes.push({
      id: i,
      x, y,
      targetX: x, targetY: y,
      color: COLORS[i % COLORS.length],
      isDistractor: false
    });
  }
  return nodes;
};

const getDifficultyConfig = (diff: DifficultyLevel) => {
  switch (diff) {
    case 1: return { nodes: 5, path: 3, display: 3000 };
    case 2: return { nodes: 6, path: 4, display: 2500 };
    case 3: return { nodes: 8, path: 5, display: 2000 };
    case 4: return { nodes: 10, path: 6, display: 1500 };
    case 5: return { nodes: 12, path: 7, display: 1000 };
    default: return { nodes: 6, path: 4, display: 2000 };
  }
};

export default function NeuralShift() {
  const {
    state, round, totalRounds, score, accuracy, streak, difficulty,
    countdown, session, startGame, startCountdown, recordCorrect, recordIncorrect, nextRound, endGame, resetGame, restartGame
  } = useGameSession({
    gameId: 'neural-shift',
    category: 'memory',
    totalRounds: 12,
    baseScore: 150,
    targetReactionTime: 2000
  });

  // --- Internal Game State ---
  const [phase, setPhase] = useState<GamePhase>('show_path');
  const [rule, setRule] = useState<RuleType>('REPEAT');
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<[number, number][]>([]);
  const [path, setPath] = useState<number[]>([]);
  const [expectedPath, setExpectedPath] = useState<number[]>([]);
  const [playerPath, setPlayerPath] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const turnStartTimeRef = useRef<number>(0);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  // Animation state for canvas rendering
  const renderState = useRef({
    pathProgress: 0, // 0 to 1 across the whole path display time
    nodes: [] as NodeData[],
    connections: [] as [number, number][],
    path: [] as number[],
    playerPath: [] as number[],
    phase: 'show_path' as GamePhase,
    feedback: null as 'correct' | 'incorrect' | null,
    displayTime: 2000
  });

  // Sync refs for canvas
  useEffect(() => {
    renderState.current = {
      ...renderState.current,
      nodes, connections, path, playerPath, phase, feedback,
      displayTime: getDifficultyConfig(difficulty).display
    };
  }, [nodes, connections, path, playerPath, phase, feedback, difficulty]);

  // --- Round Generation ---
  const startNewRound = useCallback(() => {
    const config = getDifficultyConfig(difficulty);
    
    // Determine rule based on round progress (1 to 12)
    let currentRule: RuleType = 'REPEAT';
    if (round > 2 && round <= 4) currentRule = 'REVERSE';
    else if (round > 4 && round <= 6) currentRule = 'SKIP';
    else if (round > 6 && round <= 9) currentRule = 'COLOR';
    else if (round > 9) currentRule = 'SHIFT';
    
    // Mix it up slightly at high difficulty
    if (difficulty >= 4 && round > 6) {
      const rules: RuleType[] = ['REVERSE', 'SKIP', 'COLOR', 'SHIFT'];
      currentRule = rules[Math.floor(Math.random() * rules.length)];
    }

    // Generate network
    let newNodes = generateNodes(config.nodes, 800, 600);
    
    // Generate connections (nearest neighbors)
    const conns: [number, number][] = [];
    newNodes.forEach((n1, i) => {
      // Connect to 2-3 closest
      const distances = newNodes
        .map((n2, j) => ({ j, d: distance(n1.x, n1.y, n2.x, n2.y) }))
        .filter(d => d.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      
      distances.forEach(d => {
        const pair: [number, number] = [Math.min(i, d.j), Math.max(i, d.j)];
        if (!conns.some(c => c[0] === pair[0] && c[1] === pair[1])) {
          conns.push(pair);
        }
      });
    });

    // Generate random path walking through connections
    let current = Math.floor(Math.random() * newNodes.length);
    const generatedPath = [current];
    for (let i = 1; i < config.path; i++) {
      const neighbors = conns
        .filter(c => c[0] === current || c[1] === current)
        .map(c => c[0] === current ? c[1] : c[0])
        .filter(n => !generatedPath.includes(n)); // Avoid self-intersection if possible
      
      if (neighbors.length > 0) {
        current = neighbors[Math.floor(Math.random() * neighbors.length)];
        generatedPath.push(current);
      } else {
        // Fallback: pick any unvisited node
        const unvisited = newNodes.filter(n => !generatedPath.includes(n.id));
        if (unvisited.length > 0) {
          current = unvisited[Math.floor(Math.random() * unvisited.length)].id;
          generatedPath.push(current);
        }
      }
    }

    let expected = [...generatedPath];

    // Apply rule specific modifications
    if (currentRule === 'REVERSE') {
      expected = [...generatedPath].reverse();
    } else if (currentRule === 'SKIP') {
      // Pick a node in the middle of the path to be the distractor
      const skipIdx = Math.floor(Math.random() * (generatedPath.length - 2)) + 1;
      const skipNodeId = generatedPath[skipIdx];
      newNodes = newNodes.map(n => n.id === skipNodeId ? { ...n, isDistractor: true, color: DISTRACTOR_COLOR } : n);
      expected = generatedPath.filter(id => id !== skipNodeId);
    } else if (currentRule === 'COLOR') {
      // Colors are important. When transitioning to player turn, nodes will swap positions.
      // Expected is the same spatial nodes, but they will be elsewhere. 
      // Actually, simplest COLOR rule: nodes just shuffle their colors, you have to click the nodes that now have the target colors.
      // Let's implement position shuffle instead (SHIFT).
    }

    setNodes(newNodes);
    setConnections(conns);
    setPath(generatedPath);
    setExpectedPath(expected);
    setPlayerPath([]);
    setRule(currentRule);
    setFeedback(null);
    setPhase('show_path');

    // Trigger animation flow
    let startTime = performance.now();
    const animatePath = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / config.display, 1);
      renderState.current.pathProgress = progress;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animatePath);
      } else {
        // Path done
        setPhase('show_rule');
        if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
        phaseTimeoutRef.current = setTimeout(() => {
          // Apply SHIFT or COLOR transformations before player turn
          if (currentRule === 'SHIFT' || currentRule === 'COLOR') {
            setNodes(prev => {
              const shifted = [...prev];
              // Randomly nudge all nodes
              return shifted.map(n => {
                const angle = Math.random() * Math.PI * 2;
                const dist = 60 + Math.random() * 40;
                let nx = n.x + Math.cos(angle) * dist;
                let ny = n.y + Math.sin(angle) * dist;
                // Clamp
                nx = Math.max(50, Math.min(750, nx));
                ny = Math.max(50, Math.min(550, ny));
                return { ...n, targetX: nx, targetY: ny }; // Render loop will lerp them
              });
            });
          }
          setPhase('player_turn');
          turnStartTimeRef.current = Date.now();
        }, 1500);
      }
    };
    animationRef.current = requestAnimationFrame(animatePath);

  }, [difficulty, round]);

  // Start round when state becomes playing
  useEffect(() => {
    if (state === 'playing' && round > 0) {
      startNewRound();
    }
  }, [state, round, startNewRound]);

  // Cleanup animations and timeouts
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // --- Canvas Rendering Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const { nodes: currentNodes, connections: currentConns, path: currentPath, playerPath: currentPlayerPath, phase: currentPhase, feedback: currentFeedback, pathProgress } = renderState.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Lerp node positions (for SHIFT rule)
      currentNodes.forEach(n => {
        n.x += (n.targetX - n.x) * 5 * dt;
        n.y += (n.targetY - n.y) * 5 * dt;
      });

      // Draw connections
      ctx.lineWidth = 2;
      currentConns.forEach(([id1, id2]) => {
        const n1 = currentNodes.find(n => n.id === id1);
        const n2 = currentNodes.find(n => n.id === id2);
        if (!n1 || !n2) return;

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();
      });

      // Draw active path animation
      if (currentPhase === 'show_path' && currentPath.length > 0) {
        const totalSegments = currentPath.length - 1;
        const currentSegmentProgress = pathProgress * totalSegments;
        const activeSegmentIdx = Math.floor(currentSegmentProgress);
        const segmentT = currentSegmentProgress - activeSegmentIdx;

        // Draw lines up to current progress
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(92, 124, 250, 0.8)';
        ctx.shadowColor = 'rgba(92, 124, 250, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        
        for (let i = 0; i <= activeSegmentIdx && i < currentPath.length; i++) {
          const n = currentNodes.find(node => node.id === currentPath[i]);
          if (n) {
            if (i === 0) ctx.moveTo(n.x, n.y);
            else ctx.lineTo(n.x, n.y);
          }
        }
        
        // Interpolate the moving tip
        if (activeSegmentIdx < totalSegments) {
          const n1 = currentNodes.find(node => node.id === currentPath[activeSegmentIdx]);
          const n2 = currentNodes.find(node => node.id === currentPath[activeSegmentIdx + 1]);
          if (n1 && n2) {
            const tipX = n1.x + (n2.x - n1.x) * segmentT;
            const tipY = n1.y + (n2.y - n1.y) * segmentT;
            ctx.lineTo(tipX, tipY);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw player path lines
      if ((currentPhase === 'player_turn' || currentPhase === 'feedback') && currentPlayerPath.length > 1) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = currentFeedback === 'incorrect' ? 'rgba(250, 82, 82, 0.8)' : 'rgba(81, 207, 102, 0.8)';
        ctx.beginPath();
        currentPlayerPath.forEach((id, i) => {
          const n = currentNodes.find(node => node.id === id);
          if (n) {
            if (i === 0) ctx.moveTo(n.x, n.y);
            else ctx.lineTo(n.x, n.y);
          }
        });
        ctx.stroke();
      }

      // Draw nodes
      currentNodes.forEach(n => {
        // Node base
        ctx.beginPath();
        ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
        
        // Determine style
        let fill = 'rgba(37, 43, 58, 1)';
        let stroke = n.isDistractor ? DISTRACTOR_COLOR : n.color || BASE_COLOR;
        let shadow = 0;

        const isPlayerSelected = currentPlayerPath.includes(n.id);
        const playerSelectIndex = currentPlayerPath.indexOf(n.id);

        if (currentPhase === 'show_path') {
          // Highlight nodes sequentially based on pathProgress
          const nodeIdx = currentPath.indexOf(n.id);
          if (nodeIdx !== -1) {
            const appearThreshold = nodeIdx / Math.max(1, currentPath.length - 1);
            if (pathProgress >= appearThreshold) {
              fill = stroke;
              shadow = 20;
            }
          }
        } else if (currentPhase === 'player_turn' || currentPhase === 'feedback') {
          if (isPlayerSelected) {
            fill = currentFeedback === 'incorrect' ? '#fa5252' : '#51cf66';
            stroke = fill;
            shadow = 15;
          }
        }

        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 3;
        ctx.shadowColor = stroke;
        ctx.shadowBlur = shadow;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw selection number
        if (isPlayerSelected) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((playerSelectIndex + 1).toString(), n.x, n.y);
        }
      });

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // --- Interaction ---
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'player_turn') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Find clicked node (generous hit target for mobile/touch usability)
    const clicked = nodes.find(n => distance(x, y, n.x, n.y) < 35);
    if (!clicked || playerPath.includes(clicked.id)) return;

    const newPath = [...playerPath, clicked.id];
    setPlayerPath(newPath);

    // Validate step
    const currentIndex = newPath.length - 1;
    if (newPath[currentIndex] !== expectedPath[currentIndex]) {
      // Wrong node!
      handleTurnEnd(false);
    } else if (newPath.length === expectedPath.length) {
      // Completed successfully
      handleTurnEnd(true);
    }
  };

  const handleTurnEnd = (isCorrect: boolean) => {
    setPhase('feedback');
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    const rt = Date.now() - turnStartTimeRef.current;

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      if (isCorrect) recordCorrect(rt);
      else recordIncorrect(rt);
      
      if (round >= totalRounds) {
        endGame();
      } else {
        nextRound();
      }
    }, 1000);
  };

  // --- Render Sections ---
  if (state === 'idle' || state === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] h-full p-8 animate-fade-in text-center text-white bg-gradient-to-br from-[#171A24] to-[#252837] rounded-2xl shadow-xl border border-[var(--color-surface-700)]">
        <div className="w-20 h-20 mb-6 rounded-2xl bg-[var(--color-mindora-lavender)]/20 flex items-center justify-center text-[var(--color-mindora-lavender)] animate-glow-pulse border border-[var(--color-mindora-lavender)]/30">
          <BrainIcon />
        </div>
        <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-lavender)] mb-2">
          Signature Modality
        </div>
        <h1 className="text-4xl font-bold font-serif italic mb-3 tracking-tight">Neural Shift</h1>
        <p className="text-surface-300 max-w-md mb-8 text-base leading-relaxed">
          Memorize the flowing energy pathways. Adapt as network rules dynamically shift, training working memory and cognitive flexibility.
        </p>
        
        <div className="bg-surface-800/80 p-5 rounded-xl mb-8 text-left max-w-sm w-full border border-surface-700">
          <h3 className="font-semibold text-surface-200 mb-3 uppercase tracking-wider text-xs">Dynamic Rules:</h3>
          <ul className="space-y-2 text-surface-300 text-xs">
            <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--color-mindora-lavender)]"/> Reproduce direct sequence</li>
            <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--color-mindora-coral)]"/> Reverse recall order</li>
            <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--color-mindora-mint)]"/> Filter out red distractor nodes</li>
          </ul>
        </div>
        <button 
          onClick={startCountdown}
          className="flex items-center gap-2 px-8 py-3.5 bg-[var(--color-mindora-lavender)] hover:brightness-105 text-[var(--color-mindora-ink)] rounded-xl font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <PlayIcon /> Begin Pathway Training
        </button>
      </div>
    );
  }

  if (state === 'countdown') {
    return (
      <div className="flex items-center justify-center min-h-[600px] h-full bg-gradient-to-br from-[#181c28] to-[#252b3a] rounded-2xl">
        <div className="text-8xl font-bold text-white animate-pulse-soft">
          {countdown > 0 ? countdown : 'GO!'}
        </div>
      </div>
    );
  }

  if (state === 'results') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] h-full p-8 bg-gradient-to-br from-[#181c28] to-[#252b3a] rounded-2xl text-white">
        <h2 className="text-3xl font-bold mb-8">Neural Shift Complete</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 w-full max-w-4xl">
          <div className="bg-surface-800/80 p-6 rounded-xl border border-surface-700 text-center shadow-lg">
            <div className="text-sm text-surface-400 mb-1">Overall Score</div>
            <div className="text-4xl font-bold text-[var(--color-mindora-lavender)]">{score}</div>
          </div>
          <div className="bg-surface-800/80 p-6 rounded-xl border border-surface-700 text-center shadow-lg">
            <div className="text-sm text-surface-400 mb-1">Accuracy</div>
            <div className="text-4xl font-bold text-success-400">{Math.round(accuracy * 100)}%</div>
          </div>
          <div className="bg-surface-800/80 p-6 rounded-xl border border-surface-700 text-center shadow-lg">
            <div className="text-sm text-surface-400 mb-1">Best Streak</div>
            <div className="text-4xl font-bold text-warning-400">{session?.bestStreak || 0}</div>
          </div>
          <div className="bg-surface-800/80 p-6 rounded-xl border border-surface-700 text-center shadow-lg">
            <div className="text-sm text-surface-400 mb-1">Final Level</div>
            <div className="text-4xl font-bold text-[var(--color-mindora-coral)]">{difficulty}</div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={resetGame}
            className="px-6 py-3 bg-surface-700 hover:bg-surface-600 text-white rounded-xl font-medium transition-colors cursor-pointer"
          >
            Return to Studio
          </button>
          <button 
            onClick={restartGame}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-mindora-lavender)] hover:brightness-105 text-[var(--color-mindora-ink)] rounded-xl font-bold transition-all shadow-xs cursor-pointer"
          >
            <RotateCcwIcon /> Replay Challenge
          </button>
        </div>
      </div>
    );
  }

  // PLAYING STATE
  return (
    <div className="flex flex-col h-[600px] bg-gradient-to-br from-[#181c28] to-[#252b3a] rounded-2xl overflow-hidden relative shadow-2xl">
      {/* Header HUD */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="bg-surface-900/60 backdrop-blur px-4 py-2 rounded-lg border border-surface-700 text-white">
            <span className="text-surface-400 text-sm mr-2">Score</span>
            <span className="font-bold text-lg">{score}</span>
          </div>
          {streak > 2 && (
            <div className="bg-warning-500/20 text-warning-400 px-3 py-1 rounded-full text-sm font-bold animate-fade-in-scale">
              {streak} Streak!
            </div>
          )}
        </div>
        
        <div className="bg-surface-900/60 backdrop-blur px-4 py-2 rounded-lg border border-surface-700 text-white">
          <span className="text-surface-400 text-sm mr-2">Round</span>
          <span className="font-bold">{round}</span> <span className="text-surface-500 text-sm">/ {totalRounds}</span>
        </div>
      </div>

      {/* Center HUD for Rules/Feedback */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        {phase === 'show_rule' && (
          <div className="bg-surface-900/90 backdrop-blur px-8 py-4 rounded-xl border border-surface-600 text-center animate-fade-in-scale shadow-glow-strong">
            <div className="text-[var(--color-mindora-lavender)] text-sm font-bold mb-1 tracking-widest">RULE CHANGE</div>
            <div className="text-3xl font-bold text-white">{RULE_DESCRIPTIONS[rule]}</div>
          </div>
        )}
        {phase === 'feedback' && feedback === 'correct' && (
          <div className="text-5xl font-bold text-success-400 animate-fade-in-scale drop-shadow-[0_0_20px_rgba(81,207,102,0.5)]">
            PERFECT
          </div>
        )}
        {phase === 'feedback' && feedback === 'incorrect' && (
          <div className="text-5xl font-bold text-error-500 animate-fade-in-scale drop-shadow-[0_0_20px_rgba(250,82,82,0.5)]">
            INCORRECT
          </div>
        )}
      </div>

      {/* Main Game Canvas */}
      <canvas 
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        className={`w-full h-full object-contain ${phase === 'player_turn' ? 'cursor-pointer' : 'cursor-default'}`}
      />
    </div>
  );
}
