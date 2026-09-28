import { useEffect, useRef, useState, type FormEvent } from 'react'
import { GradeIcon, Icon } from '../components/Icon'
import { SessionHeader, type SegmentState } from '../components/SessionHeader'
import { gradeAnswer } from '../lib/names'
import type { Answer, Person } from '../types'

interface Props {
  people: Person[]
  onFinish: (answers: Answer[]) => void
  onExit: () => void
}

export function RecallScreen({ people, onFinish, onExit }: Props) {
  const [answers, setAnswers] = useState<Answer[]>([])
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const person = people[index]
  const answer: Answer | undefined = answers[index]
  const isLast = index === people.length - 1

  useEffect(() => {
    inputRef.current?.focus()
  }, [index])

  const record = (response: string) => {
    setAnswers([...answers, { person, response: response.trim(), grade: gradeAnswer(response, person.name) }])
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!answer) {
      if (value.trim()) record(value)
    } else if (isLast) {
      onFinish(answers)
    } else {
      setIndex(index + 1)
      setValue('')
    }
  }

  const segments = people.map((_, i): SegmentState => answers[i]?.grade ?? (i === index ? 'current' : 'todo'))

  return (
    <div className="screen session">
      <SessionHeader phase="Recall" position={index + 1} segments={segments} onExit={onExit} />

      <form className="recall-card" onSubmit={handleSubmit}>
        <div className="portrait" data-grade={answer?.grade}>
          <img key={person.id} src={person.image} alt="Who is this?" />
        </div>

        <input
          ref={inputRef}
          className="answer-input"
          data-grade={answer?.grade}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          readOnly={Boolean(answer)}
          placeholder="Type the name…"
          aria-label="Name of this person"
          maxLength={40}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint={answer ? 'next' : 'done'}
        />

        <div className="feedback" aria-live="polite">
          {answer && <Feedback answer={answer} />}
        </div>

        {/* Distinct keys stop React from turning the clicked button into a submit button mid-click. */}
        <div className="controls">
          {answer ? (
            <button key="next" type="submit" className="btn btn-primary btn-lg">
              {isLast ? 'See results' : 'Next face'} <Icon name="next" />
            </button>
          ) : (
            <>
              <button key="skip" type="button" className="btn btn-secondary" onClick={() => record('')}>
                I don't know
              </button>
              <button key="check" type="submit" className="btn btn-primary" disabled={!value.trim()}>
                Check <Icon name="check" />
              </button>
            </>
          )}
        </div>
      </form>

      <p className="shortcuts">
        <kbd>Enter</kbd> {answer ? 'continue' : 'check'}
      </p>
    </div>
  )
}

function Feedback({ answer: { grade, person, response } }: { answer: Answer }) {
  const name = <strong>{person.name}</strong>
  return (
    <p className="feedback-panel" data-grade={grade}>
      <GradeIcon grade={grade} />
      <span>
        {grade === 'correct' && <>Correct! This is {name}.</>}
        {grade === 'close' && <>Almost! It's spelled {name}. Half a point.</>}
        {grade === 'wrong' && (response ? <>Not quite. This is {name}.</> : <>This is {name}.</>)}
      </span>
    </p>
  )
}
