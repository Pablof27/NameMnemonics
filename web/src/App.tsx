import { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './hooks/useTheme'
import { loadFaces } from './lib/api'
import { assignNames } from './lib/names'
import { shuffle } from './lib/shuffle'
import { LoadingScreen } from './screens/LoadingScreen'
import { ReadyScreen } from './screens/ReadyScreen'
import { RecallScreen } from './screens/RecallScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { SetupScreen } from './screens/SetupScreen'
import { StudyScreen } from './screens/StudyScreen'
import { loadSettings, saveSettings } from './settings'
import type { Answer, Person, Settings } from './types'

type Phase = 'setup' | 'loading' | 'study' | 'ready' | 'recall' | 'results'

export default function App() {
  const [theme, setTheme] = useTheme()
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [phase, setPhase] = useState<Phase>('setup')
  const [people, setPeople] = useState<Person[]>([])
  const [recallOrder, setRecallOrder] = useState<Person[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loaded, setLoaded] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadingRef = useRef<AbortController | null>(null)

  useEffect(() => saveSettings(settings), [settings])

  async function startSession() {
    loadingRef.current?.abort()
    const controller = new AbortController()
    loadingRef.current = controller
    setPhase('loading')
    setLoaded(0)
    setLoadError(null)
    try {
      const faces = await loadFaces(settings.faceCount, controller.signal, setLoaded)
      const names = assignNames(
        faces.map((face) => face.gender),
        settings.namePool,
      )
      setPeople(faces.map((face, i) => ({ id: face.id, image: face.image, gender: face.gender, name: names[i] })))
      setPhase('study')
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : String(error))
    }
  }

  function exitToSetup() {
    loadingRef.current?.abort()
    setPhase('setup')
  }

  function startRecall() {
    let order = shuffle(people)
    // Recalling in the study order would only test the sequence, not the faces.
    while (order.length > 1 && order.every((person, i) => person === people[i])) order = shuffle(people)
    setRecallOrder(order)
    setPhase('recall')
  }

  function showResults(result: Answer[]) {
    setAnswers(result)
    setPhase('results')
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
            <rect width="64" height="64" rx="16" fill="currentColor" />
            <circle cx="32" cy="25" r="10" fill="#fff" />
            <path d="M13 52c1.5-10 9.5-16 19-16s17.5 6 19 16z" fill="#fff" />
          </svg>
          Name Mnemonics
        </span>
        <ThemeToggle theme={theme} onChange={setTheme} />
      </header>

      <main className="main">
        {phase === 'setup' && <SetupScreen settings={settings} onChange={setSettings} onStart={startSession} />}
        {phase === 'loading' && (
          <LoadingScreen
            loaded={loaded}
            total={settings.faceCount}
            error={loadError}
            onRetry={startSession}
            onCancel={exitToSetup}
          />
        )}
        {phase === 'study' && (
          <StudyScreen
            people={people}
            secondsPerFace={settings.secondsPerFace}
            showHints={settings.hints}
            onFinish={() => setPhase('ready')}
            onExit={exitToSetup}
          />
        )}
        {phase === 'ready' && <ReadyScreen count={people.length} onStart={startRecall} />}
        {phase === 'recall' && <RecallScreen people={recallOrder} onFinish={showResults} onExit={exitToSetup} />}
        {phase === 'results' && (
          <ResultsScreen
            people={people}
            answers={answers}
            settings={settings}
            onNewFaces={startSession}
            onRetry={() => setPhase('study')}
            onChangeSettings={() => setPhase('setup')}
          />
        )}
      </main>
    </div>
  )
}
