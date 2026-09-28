import { useEffect, useRef, useState } from 'react'
import { drillQuestion } from '../lib/drill'
import { sfx } from '../lib/sound'

interface Props {
  /** Normalized names that must not appear. */
  exclude?: ReadonlySet<string>
  /** Makes the wrong options look more like the right one. */
  hard?: boolean
  disabled?: boolean
  onAnswer?: (correct: boolean, streak: number) => void
}

/** Name ↔ picture questions, shared by Picture Sprint, small talk and the loading warm-up. */
export function DrillBoard({ exclude, hard = false, disabled = false, onAnswer }: Props) {
  const [question, setQuestion] = useState(() => drillQuestion({ exclude, hard }))
  const [picked, setPicked] = useState<number | null>(null)
  const streakRef = useRef(0)
  const timerRef = useRef(0)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const choose = (index: number) => {
    if (picked !== null || disabled) return
    const correct = index === question.answer
    streakRef.current = correct ? streakRef.current + 1 : 0
    setPicked(index)
    if (correct) sfx.correct(streakRef.current)
    else sfx.wrong()
    onAnswer?.(correct, streakRef.current)
    timerRef.current = window.setTimeout(
      () => {
        setQuestion(drillQuestion({ exclude, hard, previous: question.name }))
        setPicked(null)
      },
      correct ? 450 : 1200,
    )
  }

  const chooseRef = useRef(choose)
  useEffect(() => {
    chooseRef.current = choose
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const index = Number(event.key) - 1
      if (Number.isInteger(index) && index >= 0 && index < 4) chooseRef.current(index)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="drill">
      <p className="drill-kind">{question.kind === 'encode' ? 'Which picture sounds like…' : 'Whose picture is this?'}</p>
      <p key={question.name + question.word} className="drill-prompt">
        {question.kind === 'encode' ? question.name : `“${question.word}”`}
      </p>
      <div className="choice-grid" aria-live="polite">
        {question.options.map((option, i) => (
          <button
            key={option}
            type="button"
            className="choice"
            data-state={picked === null ? undefined : i === question.answer ? 'correct' : i === picked ? 'wrong' : 'idle'}
            disabled={disabled}
            onClick={() => choose(i)}
          >
            <kbd>{i + 1}</kbd>
            <span>{option}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
