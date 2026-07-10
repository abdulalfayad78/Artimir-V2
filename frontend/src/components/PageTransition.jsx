function PageTransition({ children, className = '' }) {
  const classes = ['page-transition', className].filter(Boolean).join(' ')

  return <div className={classes}>{children}</div>
}

export default PageTransition
