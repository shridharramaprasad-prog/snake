import { useCallback, useEffect, useRef, useState } from 'react'

type Point = { x: number; y: number }
type Direction = Point
type Phase = 'ready' | 'playing' | 'paused' | 'over'
type Game = { snake: Point[]; food: Point; score: number; phase: Phase }

const GRID_SIZE = 20
const STARTING_SNAKE: Point[] = [
  { x: 9, y: 10 },
  { x: 8, y: 10 },
  { x: 7, y: 10 },
]
const DIRECTIONS: Record<string, Direction> = {
  ArrowUp: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
}

function makeFood(snake: Point[]): Point {
  const emptyCells: Point[] = []
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) emptyCells.push({ x, y })
    }
  }
  return emptyCells[Math.floor(Math.random() * emptyCells.length)] ?? { x: 0, y: 0 }
}

function freshGame(phase: Phase = 'ready'): Game {
  return { snake: STARTING_SNAKE.map((part) => ({ ...part })), food: { x: 14, y: 10 }, score: 0, phase }
}

function readBestScore(): number {
  try {
    return Number(window.localStorage.getItem('snake-best-score')) || 0
  } catch {
    return 0
  }
}

function App() {
  const [game, setGame] = useState<Game>(() => freshGame())
  const [bestScore, setBestScore] = useState(readBestScore)
  const nextDirectionRef = useRef<Direction>({ x: 1, y: 0 })
  const speed = Math.max(105, 480 - Math.floor(game.score / 50) * 35)

  const startGame = useCallback(() => {
    nextDirectionRef.current = { x: 1, y: 0 }
    setGame({ ...freshGame('playing'), food: makeFood(STARTING_SNAKE) })
  }, [])

  const togglePause = useCallback(() => {
    setGame((current) => {
      if (current.phase === 'playing') return { ...current, phase: 'paused' }
      if (current.phase === 'paused') return { ...current, phase: 'playing' }
      return current
    })
  }, [])

  const steer = useCallback((next: Direction) => {
    const current = nextDirectionRef.current
    if (next.x + current.x === 0 && next.y + current.y === 0) return
    nextDirectionRef.current = next
  }, [])

  useEffect(() => {
    if (game.phase !== 'playing') return

    const timer = window.setInterval(() => {
      setGame((current) => {
        if (current.phase !== 'playing') return current

        const direction = nextDirectionRef.current
        const head = { x: current.snake[0].x + direction.x, y: current.snake[0].y + direction.y }
        const eating = head.x === current.food.x && head.y === current.food.y
        const bodyToCheck = eating ? current.snake : current.snake.slice(0, -1)
        const hitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE
        const hitSelf = bodyToCheck.some((part) => part.x === head.x && part.y === head.y)

        if (hitWall || hitSelf) return { ...current, phase: 'over' }

        const snake = [head, ...current.snake.slice(0, eating ? undefined : -1)]
        return {
          ...current,
          snake,
          food: eating ? makeFood(snake) : current.food,
          score: current.score + (eating ? 10 : 0),
        }
      })
    }, speed)

    return () => window.clearInterval(timer)
  }, [game.phase, speed])

  useEffect(() => {
    if (game.score > bestScore) {
      setBestScore(game.score)
      try {
        window.localStorage.setItem('snake-best-score', String(game.score))
      } catch {
        // The game remains playable when browser storage is unavailable.
      }
    }
  }, [bestScore, game.score])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      const direction = DIRECTIONS[key]
      if (direction) {
        event.preventDefault()
        if (game.phase === 'playing') steer(direction)
        return
      }
      if (key === ' ' || key === 'Enter') {
        event.preventDefault()
        if (game.phase === 'ready' || game.phase === 'over') startGame()
        else if (game.phase === 'paused') togglePause()
      } else if (key.toLowerCase() === 'p' && (game.phase === 'playing' || game.phase === 'paused')) {
        togglePause()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [game.phase, startGame, steer, togglePause])

  const snakeCells = new Set(game.snake.map((part) => `${part.x},${part.y}`))
  const headPosition = `${game.snake[0].x},${game.snake[0].y}`
  const overlayTitle = game.phase === 'ready' ? 'Ready to play?' : game.phase === 'paused' ? 'Take a breather' : 'Game over'
  const overlayText = game.phase === 'ready'
    ? 'Collect the fruit. Don’t run into the walls—or yourself.'
    : game.phase === 'paused'
      ? 'Your run is paused. Pick up right where you left off.'
      : `You scored ${game.score} points. Fancy another run?`
  const actionLabel = game.phase === 'ready' ? 'Start game' : game.phase === 'paused' ? 'Resume game' : 'Play again'
  const action = game.phase === 'ready' || game.phase === 'over' ? startGame : togglePause

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="game-layout">
        <section className="intro-panel" aria-label="Game information">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div>
            <span>ARCADE <span className="brand-divider">/</span> 001</span>
          </div>
          <p className="eyebrow">A little game of focus</p>
          <h1>Snake<span className="title-period">.</span></h1>
          <p className="intro-copy">One more apple. One more turn. How long can you last?</p>

          <div className="score-cards">
            <div className="score-card score-card-current">
              <span className="score-label">CURRENT SCORE</span>
              <strong>{String(game.score).padStart(3, '0')}</strong>
              <span className="score-caption">POINTS</span>
            </div>
            <div className="score-card">
              <span className="score-label">PERSONAL BEST</span>
              <strong>{String(bestScore).padStart(3, '0')}</strong>
              <span className="score-caption">POINTS</span>
            </div>
          </div>

          <div className="controls-card">
            <div className="section-heading">
              <span className="control-glyph" aria-hidden="true">⌘</span>
              <h2>How to play</h2>
            </div>
            <div className="control-row">
              <span className="control-description">Move around</span>
              <span className="key-group"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span>
            </div>
            <div className="control-row">
              <span className="control-description">Or use</span>
              <span className="key-group wasd"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>
            </div>
            <div className="control-row">
              <span className="control-description">Pause / resume</span>
              <kbd className="wide-key">P</kbd>
            </div>
          </div>

          <div className="tip-line"><span className="tip-dot" /> The more you eat, the faster it gets.</div>
        </section>

        <section className="play-panel" aria-label="Snake game">
          <div className="game-topline">
            <div className="status-indicator">
              <span className={`status-dot ${game.phase === 'playing' ? 'is-live' : ''}`} />
              <span>{game.phase === 'playing' ? 'IN PROGRESS' : game.phase === 'paused' ? 'PAUSED' : game.phase === 'over' ? 'RUN ENDED' : 'READY WHEN YOU ARE'}</span>
            </div>
            <button className="icon-button" onClick={togglePause} disabled={game.phase === 'ready' || game.phase === 'over'} aria-label="Pause or resume game" title="Pause or resume (P)">
              {game.phase === 'paused' ? <span className="play-icon" /> : <span className="pause-icon"><i /><i /></span>}
            </button>
          </div>

          <div className={`board-frame ${game.phase !== 'playing' ? 'board-inactive' : ''}`}>
            <div className="game-board" role="grid" aria-label={`Snake game board, score ${game.score}`}>
              {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
                const x = index % GRID_SIZE
                const y = Math.floor(index / GRID_SIZE)
                const key = `${x},${y}`
                const isHead = key === headPosition
                const isSnake = snakeCells.has(key)
                const isFood = game.food.x === x && game.food.y === y
                return (
                  <div key={key} className={`cell${isSnake ? (isHead ? ' snake-head' : ' snake-body') : ''}${isFood ? ' food-cell' : ''}`} role="gridcell">
                    {isFood && <span className="food-orb" />}
                    {isHead && <span className="snake-eyes"><i /><i /></span>}
                  </div>
                )
              })}
            </div>
            {game.phase !== 'playing' && (
              <div className="board-overlay">
                <div className="overlay-card">
                  <span className="overlay-sparkle" aria-hidden="true">✳</span>
                  <p className="overlay-kicker">{game.phase === 'over' ? 'NICE RUN' : game.phase === 'paused' ? 'TIME OUT' : 'YOUR NEXT HIGH SCORE'}</p>
                  <h2>{overlayTitle}</h2>
                  <p>{overlayText}</p>
                  <button className="primary-button" onClick={action}>
                    {actionLabel}<span aria-hidden="true">↗</span>
                  </button>
                  <span className="overlay-hint">{game.phase === 'paused' ? 'or press P to continue' : 'or press space to begin'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="board-footer">
            <div className="board-legend"><span className="legend-snake" /> <span>YOU</span><span className="legend-fruit" /> <span>FRUIT</span></div>
            <span className="speed-readout"><span className="speed-bars"><i /><i /><i /><i /></span> SPEED {String(Math.min(4, Math.floor(game.score / 50) + 1)).padStart(2, '0')}</span>
          </div>

          <div className="mobile-controls" aria-label="Touch controls">
            <button className="pad-button pad-up" onClick={() => steer({ x: 0, y: -1 })} aria-label="Move up">↑</button>
            <button className="pad-button pad-left" onClick={() => steer({ x: -1, y: 0 })} aria-label="Move left">←</button>
            <button className="pad-button pad-down" onClick={() => steer({ x: 0, y: 1 })} aria-label="Move down">↓</button>
            <button className="pad-button pad-right" onClick={() => steer({ x: 1, y: 0 })} aria-label="Move right">→</button>
          </div>
        </section>
      </div>
      <footer className="page-footer"><span>MADE FOR THE LOVE OF THE GAME</span><span>TAKE YOUR TIME<span className="footer-heart"> ♥</span></span></footer>
    </main>
  )
}

export default App
