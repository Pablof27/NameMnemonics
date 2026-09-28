const STAR = 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z'

interface Props {
  count: number
  max?: number
  size?: number
  /** Pops the earned stars in one by one, starting after `delay` seconds. */
  animate?: boolean
  delay?: number
}

export function Stars({ count, max = 3, size = 18, animate = false, delay = 0 }: Props) {
  return (
    <span className="stars" role="img" aria-label={`${count} of ${max} stars`} data-animate={animate}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden="true"
          data-on={i < count}
          style={animate ? { animationDelay: `${delay + i * 0.35}s` } : undefined}
        >
          <path d={STAR} />
        </svg>
      ))}
    </span>
  )
}
