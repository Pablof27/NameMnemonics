import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { GradeIcon, Icon } from '../components/Icon'
import { SessionHeader, type SegmentState } from '../components/SessionHeader'
import { comboMultiplier, currentCombo, scoreAnswers } from '../game/scoring'
import { faceChoices, getHints, gradeAnswer, nameChoices } from '../lib/names'
import { pick, shuffle } from '../lib/shuffle'
import { sfx } from '../lib/sound'
import type { Anchor, Answer, Grade, NamePool, Person, RecallMode, StudyRecord } from '../types'

interface Props {
  /** The people to recall, in the order they come back. */
  questions: Person[]
  /** Everyone met, used to build the options. */
  people: Person[]
  mode: RecallMode
  pool: NamePool
  lifelines: number
  study?: Record<string, StudyRecord>
  phase?: string
  showScore?: boolean
  /** Replaces the score and combo display, e.g. with lives. */
  hud?: (answers: Answer[]) => ReactNode
  /** Ends the round early, e.g. when the last life is lost. */
  stopWhen?: (answers: Answer[]) => boolean
  finishLabel?: string
  stopLabel?: string
  onFinish: (answers: Answer[]) => void
  onExit: () => void
}

const REACTIONS: Record<Grade, string[]> = {
  correct: ['You remembered! 😊', 'Great to see you again!', 'Wow, you got it!', 'Nice memory!', 'That’s me! 👋'],
  close: ['So close! 😄', 'Almost! Check the spelling.'],
  wrong: ['Oops, that’s not me 😅', 'Remember me next time?', 'Hmm, not quite 🙃'],
}

export function RecallScreen({
  questions,
  people,
  mode,
  pool,
  lifelines,
  study = {},
  phase = 'Greet',
  showScore = true,
  hud,
  stopWhen,
  finishLabel = 'See results',
  stopLabel = 'See results',
  onFinish,
  onExit,
}: Props) {
  const [answers, setAnswers] = useState<Answer[]>([])
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [picked, setPicked] = useState<number | null>(null)
  const [lifelinesLeft, setLifelinesLeft] = useState(lifelines)
  const [helped, setHelped] = useState(false)
  const [removed, setRemoved] = useState<number[]>([])
  const [reaction, setReaction] = useState('')
  // Options are drawn once, so they don't reshuffle on every render.
  const [nameSets] = useState(() =>
    mode === 'choice' ? questions.map((person) => nameChoices(person, people, pool)) : [],
  )
  const [faceSets] = useState(() => (mode === 'faces' ? questions.map((person) => faceChoices(person, people)) : []))
  const inputRef = useRef<HTMLInputElement>(null)
  const startRef = useRef(0)

  const person = questions[index]
  const answer: Answer | undefined = answers[index]
  const isLast = index === questions.length - 1
  const stopped = answer !== undefined && Boolean(stopWhen?.(answers))
  const names = nameSets[index] ?? []
  const faces = faceSets[index] ?? []
  const optionCount = mode === 'choice' ? names.length : faces.length
  const correctOption = mode === 'choice' ? names.indexOf(person.name) : faces.findIndex((face) => face.id === person.id)

  useEffect(() => {
    startRef.current = performance.now()
    inputRef.current?.focus()
  }, [index])

  const record = (response: string, grade: Grade) => {
    const next = [...answers, { person, response, grade, ms: performance.now() - startRef.current, assisted: helped }]
    setAnswers(next)
    setReaction(pick(REACTIONS[grade]))
    // Keeps Enter working after clicking "I don't know", which removes the focused button.
    inputRef.current?.focus()
    if (grade === 'correct') sfx.correct(helped ? 1 : currentCombo(next))
    else if (grade === 'close') sfx.close()
    else sfx.wrong()
  }

  const choose = (option: number) => {
    if (answer || removed.includes(option) || option >= optionCount) return
    setPicked(option)
    if (mode === 'choice') record(names[option], option === correctOption ? 'correct' : 'wrong')
    else record(faces[option].name, option === correctOption ? 'correct' : 'wrong')
  }

  const proceed = () => {
    if (isLast || stopped) {
      onFinish(answers)
      return
    }
    setIndex(index + 1)
    setValue('')
    setPicked(null)
    setHelped(false)
    setRemoved([])
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (answer) proceed()
    else if (mode === 'typed' && value.trim()) record(value.trim(), gradeAnswer(value, person.name))
  }

  const takeLifeline = () => {
    if (answer || helped || lifelinesLeft === 0) return
    setLifelinesLeft(lifelinesLeft - 1)
    setHelped(true)
    if (mode !== 'typed') {
      const wrong = Array.from({ length: optionCount }, (_, i) => i).filter((i) => i !== correctOption)
      setRemoved(shuffle(wrong).slice(0, 2))
    }
    sfx.tap()
    inputRef.current?.focus()
  }

  const chooseRef = useRef(choose)
  useEffect(() => {
    chooseRef.current = choose
  })

  useEffect(() => {
    if (mode === 'typed') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const option = Number(event.key) - 1
      if (Number.isInteger(option) && option >= 0 && option < 4) chooseRef.current(option)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode])

  const scored = scoreAnswers(answers, mode, study)
  const score = scored.reduce((sum, item) => sum + item.total, 0)
  const last = answer ? scored[index] : undefined
  const combo = currentCombo(answers)
  const segments = questions.map((_, i): SegmentState => answers[i]?.grade ?? (i === index ? 'current' : 'todo'))
  const optionState = (option: number) => {
    if (removed.includes(option)) return 'removed'
    if (!answer) return undefined
    if (option === correctOption) return 'correct'
    return option === picked ? 'wrong' : 'idle'
  }

  return (
    <div className="screen session">
      <SessionHeader phase={phase} position={index + 1} segments={segments} onExit={onExit} />

      <div className="recall-hud">
        {hud ? (
          hud(answers)
        ) : showScore ? (
          <span className="hud-score">
            <strong>{score.toLocaleString('en')}</strong> pts
            {last && last.total > 0 && (
              <span key={answers.length} className="points-pop">
                +{last.total}
              </span>
            )}
          </span>
        ) : (
          <span />
        )}
        {!hud && combo >= 2 && (
          <span key={combo} className="combo" data-hot={comboMultiplier(combo) > 1}>
            🔥 {combo} in a row{comboMultiplier(combo) > 1 && ` · ×${comboMultiplier(combo)}`}
          </span>
        )}
        {lifelines > 0 && (
          <button
            type="button"
            className="lifeline"
            disabled={Boolean(answer) || helped || lifelinesLeft === 0}
            onClick={takeLifeline}
            title={mode === 'typed' ? 'Reveals the first letter. Half points.' : 'Removes two wrong options. Half points.'}
          >
            🛟 Lifeline <span className="lifeline-count">{lifelinesLeft}</span>
          </button>
        )}
      </div>

      <form className="recall-card" onSubmit={handleSubmit}>
        {mode === 'faces' ? (
          <>
            <p className="faces-prompt">
              Where is <strong>{person.name}</strong>?
            </p>
            <div className="face-grid">
              {faces.map((face, option) => (
                <button
                  key={face.id}
                  type="button"
                  className="face-option"
                  data-state={optionState(option)}
                  disabled={Boolean(answer) || removed.includes(option)}
                  onClick={() => choose(option)}
                >
                  <img src={face.image} alt={`Option ${option + 1}`} />
                  <kbd>{option + 1}</kbd>
                  {answer && option === correctOption && (
                    <span className="bubble" aria-hidden="true">
                      {answer.grade === 'correct' ? 'That’s me! 👋' : 'Over here! 👋'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="portrait" data-grade={answer?.grade} data-vip={Boolean(person.vip)}>
            <img key={person.id} src={person.image} alt="Who is this?" />
            {person.vip && <span className="vip-badge">🌟 VIP · double points</span>}
            {answer && (
              <span key={index} className="bubble" aria-hidden="true">
                {reaction}
              </span>
            )}
          </div>
        )}

        {mode === 'typed' && (
          <>
            <input
              ref={inputRef}
              className="answer-input"
              data-grade={answer?.grade}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              readOnly={Boolean(answer)}
              placeholder={helped ? `Starts with “${person.name[0]}”…` : 'Type the name…'}
              aria-label="Name of this person"
              maxLength={40}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint={answer ? 'next' : 'done'}
            />
            {helped && !answer && <p className="lifeline-hint">🛟 It starts with “{person.name[0]}”</p>}
          </>
        )}

        {mode === 'choice' && (
          <div className="choice-grid">
            {names.map((name, option) => (
              <button
                key={name}
                type="button"
                className="choice"
                data-state={optionState(option)}
                disabled={Boolean(answer) || removed.includes(option)}
                onClick={() => choose(option)}
              >
                <kbd>{option + 1}</kbd>
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="feedback" aria-live="polite">
          {answer && <Feedback answer={answer} anchor={study[person.id]?.anchor} />}
        </div>

        {/* Distinct keys stop React from turning the clicked button into a submit button mid-click. */}
        <div className="controls">
          {answer ? (
            <button key="next" type="submit" className="btn btn-primary btn-lg" autoFocus={mode !== 'typed'}>
              {stopped ? stopLabel : isLast ? finishLabel : 'Next'} <Icon name="next" />
            </button>
          ) : mode === 'typed' ? (
            <>
              <button key="skip" type="button" className="btn btn-secondary" onClick={() => record('', 'wrong')}>
                I don't know
              </button>
              <button key="check" type="submit" className="btn btn-primary" disabled={!value.trim()}>
                Check <Icon name="check" />
              </button>
            </>
          ) : null}
        </div>
      </form>

      <p className="shortcuts">
        {mode === 'typed' ? (
          <>
            <kbd>Enter</kbd> {answer ? 'continue' : 'check'}
          </>
        ) : (
          <>
            <kbd>1</kbd>–<kbd>4</kbd> choose · <kbd>Enter</kbd> continue
          </>
        )}
      </p>
    </div>
  )
}

function Feedback({ answer: { grade, person, response, assisted }, anchor }: { answer: Answer; anchor?: Anchor }) {
  const name = <strong>{person.name}</strong>
  const hints = getHints(person.name)
  return (
    <div className="feedback-panel" data-grade={grade}>
      <GradeIcon grade={grade} />
      <div>
        <p>
          {grade === 'correct' && (assisted ? <>Right, this is {name}. Lifeline: half points.</> : <>Correct! This is {name}.</>)}
          {grade === 'close' && <>Almost! It's spelled {name}. Half points.</>}
          {grade === 'wrong' && (response ? <>Not quite, this is {name}.</> : <>This is {name}.</>)}
        </p>
        {grade !== 'correct' && (hints.length > 0 || anchor) && (
          <p className="feedback-tip">
            {hints.length > 0 && <>Picture it: {hints.join(' · ')}. </>}
            {anchor && <>Your anchor was the {anchor.region}.</>}
          </p>
        )}
      </div>
    </div>
  )
}
