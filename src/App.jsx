import React, { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const initialState = () => ({
  timeLeft: 60,
  gameActive: false,
  alphaWeightedBets: 0,
  betaWeightedBets: 0,
  playerAlphaBets: 0,
  playerBetaBets: 0,
  alphaPlayers: 0,
  betaPlayers: 0,
  totalPot: 0,
})

export default function App() {
  const [state, setState] = useState(initialState)
  const timerRef = useRef(null)
  const [attackFx, setAttackFx] = useState({ symbol: '💥', color: '#ff6b6b', visible: false })
  const weight = useMemo(() => Math.max(0.5, state.timeLeft / 60), [state.timeLeft])

  const startNewGame = () => {
    clearInterval(timerRef.current)
    const fresh = initialState()
    fresh.gameActive = true
    setState(fresh)

    timerRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.gameActive) return prev
        const nextTime = prev.timeLeft - 1
        if (nextTime <= 0) {
          clearInterval(timerRef.current)
          return { ...prev, timeLeft: 0, gameActive: false }
        }
        return { ...prev, timeLeft: nextTime }
      })
    }, 1000)
  }

  const endGame = () => {
    if (!state.gameActive) return
    clearInterval(timerRef.current)
    setState(prev => ({ ...prev, gameActive: false }))
  }

  // Derived data for bars
  const totalWeighted = state.alphaWeightedBets + state.betaWeightedBets
  const alphaPercent = totalWeighted > 0 ? (state.alphaWeightedBets / totalWeighted) * 100 : 100
  const betaPercent  = totalWeighted > 0 ? (state.betaWeightedBets  / totalWeighted) * 100 : 100

  const maxBets = Math.max(state.alphaWeightedBets, state.betaWeightedBets, 1000)
  const alphaScale = Math.min(2, Math.max(0.8, 0.8 + (state.alphaWeightedBets / maxBets) * 1.2))
  const betaScale  = Math.min(2, Math.max(0.8, 0.8 + (state.betaWeightedBets  / maxBets) * 1.2))

  const battleStatus = !state.gameActive ? { text: 'READY', cls: 'text-purple-400' }
    : state.timeLeft <= 10 ? { text: 'FINAL', cls: 'text-red-400 animate-pulse' }
    : { text: 'FIGHT!', cls: 'text-green-400' }

  const placeBet = (side, amount) => {
    setState(prev => {
      let {
        alphaWeightedBets, betaWeightedBets,
        playerAlphaBets, playerBetaBets,
        alphaPlayers, betaPlayers, totalPot, gameActive
      } = prev

      // autostart
      if (!gameActive) {
        // Start and then apply bet in a second state update
        setTimeout(() => placeBet(side, amount), 0)
        startNewGame()
        return prev
      }

      const weightedAmount = amount * weight
      if (side === 'alpha') {
        alphaWeightedBets += weightedAmount
        const first = playerAlphaBets === 0
        playerAlphaBets += amount
        if (first) alphaPlayers += 1
      } else {
        betaWeightedBets += weightedAmount
        const first = playerBetaBets === 0
        playerBetaBets += amount
        if (first) betaPlayers += 1
      }
      totalPot += amount
      triggerAttack(side)
      return {
        ...prev,
        alphaWeightedBets, betaWeightedBets,
        playerAlphaBets, playerBetaBets,
        alphaPlayers, betaPlayers, totalPot
      }
    })
  }

  const triggerAttack = (side) => {
    const effects = side === 'alpha' ? ['🔥','💥','⚡','🌟'] : ['❄️','💎','⚡','✨']
    const symbol = effects[Math.floor(Math.random() * effects.length)]
    const color = side === 'alpha' ? '#ff6b6b' : '#74b9ff'
    setAttackFx({ symbol, color, visible: true })
    setTimeout(() => setAttackFx(f => ({ ...f, visible: false })), 600)
  }

  const switchSide = (newSide) => {
    if (!state.gameActive) return
    setState(prev => {
      const penalty = 0.1
      let {
        alphaWeightedBets, betaWeightedBets,
        playerAlphaBets, playerBetaBets,
        alphaPlayers, betaPlayers
      } = prev

      if (newSide === 'alpha' && playerBetaBets > 0) {
        const transferAmount = playerBetaBets * (1 - penalty)
        alphaWeightedBets += transferAmount * weight
        betaWeightedBets  -= playerBetaBets * weight
        playerAlphaBets = transferAmount
        playerBetaBets = 0
        betaPlayers = Math.max(0, betaPlayers - 1)
        alphaPlayers += 1
      } else if (newSide === 'beta' && playerAlphaBets > 0) {
        const transferAmount = playerAlphaBets * (1 - penalty)
        betaWeightedBets  += transferAmount * weight
        alphaWeightedBets -= playerAlphaBets * weight
        playerBetaBets = transferAmount
        playerAlphaBets = 0
        alphaPlayers = Math.max(0, alphaPlayers - 1)
        betaPlayers += 1
      }
      return {
        ...prev,
        alphaWeightedBets, betaWeightedBets,
        playerAlphaBets, playerBetaBets,
        alphaPlayers, betaPlayers
      }
    })
  }

  // Winner + winnings when game becomes inactive
  const winner = useMemo(() => {
    if (state.gameActive) return null
    if (state.alphaWeightedBets > state.betaWeightedBets) return 'Alpha'
    if (state.betaWeightedBets > state.alphaWeightedBets) return 'Beta'
    return 'Tie'
  }, [state.gameActive, state.alphaWeightedBets, state.betaWeightedBets])

  const playerWinnings = useMemo(() => {
    if (state.gameActive) return 0
    if (winner === 'Alpha' && state.playerAlphaBets > 0) {
      const playerShare = state.playerAlphaBets / (state.alphaWeightedBets / Math.max(weight, 0.5))
      return state.totalPot * playerShare
    }
    if (winner === 'Beta' && state.playerBetaBets > 0) {
      const playerShare = state.playerBetaBets / (state.betaWeightedBets / Math.max(weight, 0.5))
      return state.totalPot * playerShare
    }
    return 0
  }, [state, winner, weight])

  useEffect(() => () => clearInterval(timerRef.current), [])

  return (
    <div className="relative z-10 container mx-auto px-6 py-8 min-h-screen flex flex-col">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-5xl font-black text-white mb-4 tracking-wide retro-text">SHADOW MAJORITY</h1>
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent flex-1"></div>
          <span className="text-lg text-gray-500">⚔️</span>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent flex-1"></div>
        </div>
        <p className="text-lg text-gray-300 font-medium retro-text">TEKKEN ARENA</p>
        <p className="text-sm text-gray-500 mt-2">Choose your fighter • Battle for supremacy</p>
      </div>

      {/* Status Panel */}
      <div className="glass-panel rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center text-center">
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">Round Timer</div>
            <div className="text-4xl font-black text-white retro-text">{state.timeLeft}</div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
              <div className="progress-bar h-2 rounded-full transition-all duration-1000" style={{ width: `${(state.timeLeft/60)*100}%` }}></div>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">Prize Pool</div>
            <div className="text-3xl font-black text-yellow-400 retro-text">${state.totalPot.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">Bet Power</div>
            <div className="w-full bg-gray-800 rounded-full h-4 mb-2">
              <div className="progress-bar h-4 rounded-full transition-all duration-300" style={{ width: `${weight*100}%` }}></div>
            </div>
            <div className="text-xs text-green-400">Early = Max Power</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">Fight Status</div>
            <div className={`text-lg font-bold retro-text ${battleStatus.cls}`}>{battleStatus.text}</div>
          </div>
        </div>
      </div>

      {/* Arena */}
      <div className="flex-1 flex items-center justify-center mb-6">
        <div className="relative w-full max-w-6xl h-96 arena-bg rounded-lg overflow-hidden pixel-border">
          {/* Arena Lights */}
          <div className="arena-lights left-20"></div>
          <div className="arena-lights right-20"></div>
          <div className="arena-lights left-1/2 transform -translate-x-1/2"></div>

          {/* Crowd */}
          <div className="absolute top-4 left-4 right-4 h-16 flex justify-center items-end space-x-1 opacity-60">
            {Array.from({length: 10}).map((_,i)=>(
              <div key={i} className="crowd-pixel" style={{ animationDelay: `${(i%6)*0.1}s` }}></div>
            ))}
          </div>

          {/* Health Bars */}
          <div className="absolute top-8 left-8 right-8 flex justify-between items-center">
            {/* Alpha */}
            <div className="w-1/3">
              <div className="text-white font-bold mb-2 retro-text">ALPHA WARRIOR</div>
              <div className="health-bar">
                <div className="health-fill-alpha" style={{ width: `${Math.max(10, alphaPercent)}%` }}></div>
              </div>
              <div className="text-sm text-gray-300 mt-1">${Math.round(state.alphaWeightedBets).toLocaleString()}</div>
            </div>
            {/* VS */}
            <div className="text-4xl font-black text-white retro-text animate-pulse">VS</div>
            {/* Beta */}
            <div className="w-1/3 text-right">
              <div className="text-white font-bold mb-2 retro-text">BETA WARRIOR</div>
              <div className="health-bar">
                <div className="health-fill-beta" style={{ width: `${Math.max(10, betaPercent)}%` }}></div>
              </div>
              <div className="text-sm text-gray-300 mt-1">${Math.round(state.betaWeightedBets).toLocaleString()}</div>
            </div>
          </div>

          {/* Arena Floor */}
          <div className="absolute bottom-0 left-0 right-0 h-24 arena-floor"></div>

          {/* Alpha Fighter */}
          <div className={`absolute left-24 bottom-24 ${state.alphaWeightedBets >= state.betaWeightedBets ? 'fighter-winning' : 'fighter-idle'}`} style={{ transform: `scale(${alphaScale})` }}>
            <div className="fighter-alpha pixel-art">
              <div className="anime-character-alpha"></div>
            </div>
            <div className="text-center mt-2">
              <div className="text-white font-bold text-sm retro-text">ALPHA</div>
              <div className="text-xs text-red-400">🔥 FIRE WARRIOR</div>
            </div>
          </div>

          {/* Beta Fighter */}
          <div className={`absolute right-24 bottom-24 ${state.betaWeightedBets >= state.alphaWeightedBets ? 'fighter-winning' : 'fighter-idle'}`} style={{ transform: `scale(${betaScale})` }}>
            <div className="fighter-beta pixel-art" style={{ transform: 'scaleX(-1)' }}>
              <div className="anime-character-beta" style={{ transform: 'scaleX(-1)' }}></div>
            </div>
            <div className="text-center mt-2">
              <div className="text-white font-bold text-sm retro-text">BETA</div>
              <div className="text-xs text-blue-400">❄️ ICE STRIKER</div>
            </div>
          </div>

          {/* Battle Effects */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-6xl transition-all duration-500 retro-text"
              style={{ opacity: attackFx.visible ? 1 : 0, color: attackFx.color }}>
              {attackFx.symbol}
            </div>
          </div>

          {/* Victory Banner */}
          {!state.gameActive && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500">
              <div className="glass-panel rounded-xl p-6 text-center pixel-border">
                <div className="text-4xl font-black text-yellow-400 mb-2 retro-text">
                  {winner === 'Tie' ? '🤝 DRAW' : `🏆 ${winner?.toUpperCase()} WINS`}
                </div>
                <div className="text-lg text-white retro-text mb-2">
                  {winner === 'Tie' ? 'DOUBLE K.O.' : 'FLAWLESS VICTORY'}
                </div>
                <div className="text-lg text-yellow-400 font-bold retro-text">
                  Prize: ${Math.round(playerWinnings).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selection & Betting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alpha Panel */}
        <div className="glass-panel rounded-2xl p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-20 fighter-alpha pixel-art mr-4 scale-75">
              <div className="anime-character-alpha"></div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-red-400 retro-text">ALPHA WARRIOR</h3>
              <p className="text-sm text-gray-400">Fire Element • Explosive Attacks</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-center">
            <div className="glass-panel rounded-lg p-3">
              <div className="text-xs text-gray-400 uppercase">Your Bets</div>
              <div className="text-xl font-bold text-white retro-text">${state.playerAlphaBets.toLocaleString()}</div>
            </div>
            <div className="glass-panel rounded-lg p-3">
              <div className="text-xs text-gray-400 uppercase">Supporters</div>
              <div className="text-xl font-bold text-red-400 retro-text">{state.alphaPlayers}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={()=>placeBet('alpha',100)} className="cyber-button bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-2 rounded-lg transition-all transform hover:scale-105">$100</button>
              <button onClick={()=>placeBet('alpha',500)} className="cyber-button bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-2 rounded-lg transition-all transform hover:scale-105">$500</button>
              <button onClick={()=>placeBet('alpha',1000)} className="cyber-button bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-2 rounded-lg transition-all transform hover:scale-105">$1000</button>
            </div>
            <button onClick={()=>switchSide('alpha')} className="cyber-button w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all">🔄 SWITCH TO ALPHA (-10%)</button>
          </div>
        </div>

        {/* Beta Panel */}
        <div className="glass-panel rounded-2xl p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-20 fighter-beta pixel-art mr-4 scale-75">
              <div className="anime-character-beta" style={{ transform: 'scaleX(-1)' }}></div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-blue-400 retro-text">BETA STRIKER</h3>
              <p className="text-sm text-gray-400">Ice Element • Lightning Speed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-center">
            <div className="glass-panel rounded-lg p-3">
              <div className="text-xs text-gray-400 uppercase">Your Bets</div>
              <div className="text-xl font-bold text-white retro-text">${state.playerBetaBets.toLocaleString()}</div>
            </div>
            <div className="glass-panel rounded-lg p-3">
              <div className="text-xs text-gray-400 uppercase">Supporters</div>
              <div className="text-xl font-bold text-blue-400 retro-text">{state.betaPlayers}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={()=>placeBet('beta',100)} className="cyber-button bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-2 rounded-lg transition-all transform hover:scale-105">$100</button>
              <button onClick={()=>placeBet('beta',500)} className="cyber-button bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-2 rounded-lg transition-all transform hover:scale-105">$500</button>
              <button onClick={()=>placeBet('beta',1000)} className="cyber-button bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-2 rounded-lg transition-all transform hover:scale-105">$1000</button>
            </div>
            <button onClick={()=>switchSide('beta')} className="cyber-button w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all">🔄 SWITCH TO BETA (-10%)</button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="text-center mt-6">
        <button onClick={startNewGame} className="cyber-button bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 mr-4 shadow-lg retro-text">🥊 START FIGHT</button>
        <button onClick={endGame} className="cyber-button bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg retro-text">🏁 END ROUND</button>
      </div>
    </div>
  )
}
