import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type CSSProperties } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', icon, children, className = '', style, ...rest },
  ref
) {
  const cls = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', className]
    .filter(Boolean)
    .join(' ')
  const s: CSSProperties | undefined = style
  return (
    <button ref={ref} className={cls} style={s} {...rest}>
      {icon}
      {children}
    </button>
  )
})
