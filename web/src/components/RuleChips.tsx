import { RECALL_LABELS } from '../settings'
import type { EventRules, HintRule, RecallMode } from '../types'

const RECALL_EMOJI: Record<RecallMode, string> = { typed: '⌨️', choice: '👆', faces: '🔍' }
const HINT_CHIPS: Record<HintRule, [string, string]> = {
  on: ['💡', 'Picture hints'],
  optional: ['💡', 'Hints optional'],
  off: ['🚫', 'No hints'],
}

export function RuleChips({ rules }: { rules: EventRules }) {
  const chips: [string, string][] = [
    ['👥', `${rules.faceCount} guests`],
    ['⏱️', `${rules.secondsPerFace}s each`],
    [RECALL_EMOJI[rules.recall], RECALL_LABELS[rules.recall]],
  ]
  if (rules.namePool === 'extended') chips.push(['🦜', 'Rare names'])
  chips.push(HINT_CHIPS[rules.hints])
  if (rules.faceFirst) chips.push(['👀', 'Face first'])
  if (rules.vips > 0) chips.push(['🌟', rules.vips === 1 ? '1 VIP guest' : `${rules.vips} VIP guests`])
  if (rules.smallTalk > 0) chips.push(['🗣️', `${rules.smallTalk}s small talk`])
  if (rules.lifelines > 0) chips.push(['🛟', rules.lifelines === 1 ? '1 lifeline' : `${rules.lifelines} lifelines`])

  return (
    <ul className="rule-chips">
      {chips.map(([emoji, label]) => (
        <li key={label}>
          <span aria-hidden="true">{emoji}</span> {label}
        </li>
      ))}
    </ul>
  )
}
