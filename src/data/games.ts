/**
 * MINDORA Game Registry
 * Central registry of all available cognitive training games.
 */

import type { GameConfig, CognitiveCategory } from '../types';

export const GAMES: GameConfig[] = [
  // Core Existing Games
  {
    id: 'memory-matrix',
    name: 'Memory Matrix',
    description: 'Remember and reproduce patterns on a grid. Tests your spatial working memory by challenging you to recall increasingly complex arrangements.',
    shortDescription: 'Spatial pattern recall',
    category: 'memory',
    icon: '🧠',
    color: '#845ef7',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'A pattern will briefly appear on the grid',
      'Memorize the highlighted cells',
      'Reproduce the pattern by clicking the correct cells',
      'Patterns grow more complex as you improve',
    ],
  },
  {
    id: 'rapid-match',
    name: 'Rapid Match',
    description: 'Make fast visual comparisons and decisions. Tests your processing speed and ability to quickly identify similarities and differences.',
    shortDescription: 'Speed processing challenge',
    category: 'speed',
    icon: '⚡',
    color: '#22b8cf',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 2,
    instructions: [
      'Two symbols will appear on screen',
      'Quickly decide if they match or differ',
      'Tap Match or Different as fast as you can',
      'Speed and accuracy both matter',
    ],
  },
  {
    id: 'logic-chains',
    name: 'Logic Chains',
    description: 'Solve visual pattern sequences and logical relationships. Tests your ability to identify rules and predict the next element.',
    shortDescription: 'Pattern reasoning puzzles',
    category: 'problem-solving',
    icon: '🧩',
    color: '#51cf66',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Observe the pattern sequence shown',
      'Identify the underlying rule or transformation',
      'Select the element that completes the pattern',
      'Patterns involve shape, color, size, and rotation',
    ],
  },
  {
    id: 'orbit-tracker',
    name: 'Orbit Tracker',
    description: 'Track multiple moving objects simultaneously. Tests your spatial reasoning and divided attention across dynamic visual elements.',
    shortDescription: 'Multi-object tracking',
    category: 'spatial',
    icon: '🔮',
    color: '#f06595',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Several objects will be highlighted as targets',
      'All objects begin to move and become identical',
      'Track the target objects as they move',
      'Click the targets when the motion stops',
    ],
  },
  {
    id: 'neural-shift',
    name: 'Neural Shift',
    description: 'Navigate neural pathways through shifting rules. The signature MINDORA experience combining working memory, cognitive flexibility, and focus.',
    shortDescription: 'Adaptive neural pathway challenge',
    category: 'memory',
    icon: '✦',
    color: '#9A8FE8',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 4,
    instructions: [
      'A path through connected nodes will be shown',
      'Memorize the sequence of nodes in the path',
      'Reproduce the path by clicking nodes in order',
      'Rules shift each round — stay flexible!',
    ],
  },

  // 10 Original New Games
  {
    id: 'pattern-forge',
    name: 'Pattern Forge',
    description: 'Infer procedural transformations and glyph mutations across geometric rules. Tests inductive logic and rule extraction.',
    shortDescription: 'Symbolic transformation logic',
    category: 'problem-solving',
    icon: '📐',
    color: '#6366f1',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Inspect the sequential glyph transformation stages',
      'Deduce the underlying geometric operations and permutations',
      'Select the candidate that correctly completes the matrix',
      'Use number keys 1-4 or direct clicks for rapid selection',
    ],
  },
  {
    id: 'echo-recall',
    name: 'Echo Recall',
    description: 'Harmonic working memory pad. Retain resonant chimes and spatial audio-visual cues across forward and reversed temporal sequences.',
    shortDescription: 'Harmonic tone sequence memory',
    category: 'memory',
    icon: '🔔',
    color: '#8b5cf6',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Listen and observe the highlighted chime pads in order',
      'Note the prompt rule: REPRODUCE (forward) or REVERSE (backward)',
      'Click or tap the sound pads in the requested order',
      'Keys 1-4 correspond directly to the tone pads',
    ],
  },
  {
    id: 'number-cascade',
    name: 'Number Cascade',
    description: 'Extrapolate arithmetic, geometric, alternating, and Fibonacci progressions under strict temporal constraints.',
    shortDescription: 'Numerical sequence reasoning',
    category: 'problem-solving',
    icon: '🔢',
    color: '#10b981',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Analyze the cascading sequence of numbers',
      'Calculate the mathematical step or alternating pattern',
      'Select the correct missing number before time elapses',
      'Keyboard keys 1-4 provide instant input',
    ],
  },
  {
    id: 'route-weaver',
    name: 'Route Weaver',
    description: 'Memorize high-density nodal routes through spatial mazes and trace the path from origin to destination without stepping off course.',
    shortDescription: 'Spatial maze route navigation',
    category: 'spatial',
    icon: '🧭',
    color: '#f59e0b',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'A glowing path will illuminate through the nodal maze',
      'Commit the entire route to spatial working memory',
      'When hidden, trace the path starting from Node 0',
      'Navigate to the glowing destination portal',
    ],
  },
  {
    id: 'word-circuit',
    name: 'Word Circuit',
    description: 'Cognitive relational mapping and semantic analogies across conceptual, functional, and structural dimensions.',
    shortDescription: 'Relational verbal analogies',
    category: 'problem-solving',
    icon: '🔗',
    color: '#06b6d4',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Evaluate the relational bridge: "A is to B as C is to ..."',
      'Identify whether the relation is functional, antonym, cause, or part',
      'Choose the word that precisely completes the analogy',
      'Press keys 1-4 or tap your choice',
    ],
  },
  {
    id: 'signal-switch',
    name: 'Signal Switch',
    description: 'Executive functioning and Wisconsin/Stroop-inspired rule flexibility. Switch sorting criteria instantly between Color, Shape, and Count.',
    shortDescription: 'Executive rule switching',
    category: 'attention',
    icon: '🚦',
    color: '#ec4899',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Check the active sorting rule at the top (COLOR, SHAPE, or COUNT)',
      'Inspect the target card and match it to one of the 4 bins',
      'Stay alert: rules switch suddenly every few rounds',
      'Press keys 1-4 to sort rapidly',
    ],
  },
  {
    id: 'balance-lab',
    name: 'Balance Lab',
    description: 'Deduce relative mass hierarchies from two comparative balance scales to identify the heaviest or lightest specimen.',
    shortDescription: 'Transitive scale weight deduction',
    category: 'problem-solving',
    icon: '⚖️',
    color: '#14b8a6',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Observe the tilts of Scale A and Scale B',
      'Apply transitive deduction (e.g., if X > Y and Y > Z then X is heaviest)',
      'Check whether the goal asks for HEAVIEST or LIGHTEST',
      'Click the correct element or press keys 1-4',
    ],
  },
  {
    id: 'silent-sequence',
    name: 'Silent Sequence',
    description: 'Combat visual change blindness. Detect subtle shape, color, or rotational mutations across rapid occluding shutter intervals.',
    shortDescription: 'Visual shutter change detection',
    category: 'attention',
    icon: '👁️',
    color: '#f97316',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Examine the grid of symbols before the shutter closes',
      'When the shutter re-opens, spot the single item that mutated',
      'Click the modified item immediately',
      'Fewer seconds to memorize as difficulty scales',
    ],
  },
  {
    id: 'time-navigator',
    name: 'Time Navigator',
    description: 'High-speed perceptual discrimination and cognitive reaction tempo. Classify criteria rapidly with dual-key responsiveness.',
    shortDescription: 'Rapid criterion classification',
    category: 'speed',
    icon: '⏱️',
    color: '#eab308',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 2,
    instructions: [
      'Read the active classification rule at the top',
      'Decide if the stimulus matches the rule as fast as possible',
      'Press LEFT ARROW (or A) for YES, RIGHT ARROW (or D) for NO',
      'Maintain rhythm and speed without breaking your streak',
    ],
  },
  {
    id: 'memory-mosaic',
    name: 'Memory Mosaic',
    description: 'Multi-hue spatial reconstruction. Commit a vibrant palette pattern to memory and paint back the mosaic tile by tile.',
    shortDescription: 'Chromatic mosaic reconstruction',
    category: 'spatial',
    icon: '🎨',
    color: '#a855f7',
    minDifficulty: 1,
    maxDifficulty: 5,
    estimatedTime: 3,
    instructions: [
      'Memorize the colors of all active tiles before the timer expires',
      'Select a pigment from the color palette below',
      'Click grid cells to paint them back to their original hues',
      'Click Submit Mosaic when you have reproduced the pattern',
    ],
  },
];

export function getGame(id: string): GameConfig | undefined {
  const game = GAMES.find((g) => g.id === id);
  if (game) return game;
  // Graceful fallback for historical user records
  if (id === 'focus-finder') {
    return {
      id: 'focus-finder',
      name: 'Focus Finder (Archived)',
      description: 'Archived legacy attention assessment training.',
      shortDescription: 'Archived module',
      category: 'attention',
      icon: '🎯',
      color: '#ff922b',
      minDifficulty: 1,
      maxDifficulty: 5,
      estimatedTime: 3,
      instructions: ['This module has been archived and preserved for historical session metrics.'],
    };
  }
  return undefined;
}

export function getGamesByCategory(category: CognitiveCategory): GameConfig[] {
  return GAMES.filter((g) => g.category === category);
}

export function getSignatureGame(): GameConfig {
  return GAMES.find((g) => g.id === 'neural-shift')!;
}

