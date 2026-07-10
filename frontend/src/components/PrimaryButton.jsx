import useTranslation from '../i18n/useTranslation'

function PrimaryButton({ children, className = '', ...buttonProps }) {
  const { isRtl } = useTranslation()
  const classes = ['primary-button', className].filter(Boolean).join(' ')

  return (
    <button className={classes} type="button" {...buttonProps}>
      <span className="primary-button__label">{children}</span>
      <span className="primary-button__arrow" aria-hidden="true">
        {isRtl ? '←' : '→'}
      </span>
      <span className="primary-button__glow" aria-hidden="true" />
    </button>
  )
}

export default PrimaryButton
