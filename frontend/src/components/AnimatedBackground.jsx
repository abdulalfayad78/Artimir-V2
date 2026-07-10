function AnimatedBackground() {
  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-background__grid" />
      <div className="ambient-background__halo ambient-background__halo--top" />
      <div className="ambient-background__halo ambient-background__halo--bottom" />
      <div className="ambient-background__facets">
        <span className="ambient-background__facet ambient-background__facet--north-west" />
        <span className="ambient-background__facet ambient-background__facet--north" />
        <span className="ambient-background__facet ambient-background__facet--north-east" />
        <span className="ambient-background__facet ambient-background__facet--west" />
        <span className="ambient-background__facet ambient-background__facet--east" />
        <span className="ambient-background__facet ambient-background__facet--south-west" />
        <span className="ambient-background__facet ambient-background__facet--south" />
        <span className="ambient-background__facet ambient-background__facet--south-east" />
        <span className="ambient-background__facet ambient-background__facet--center" />
        <span className="ambient-background__ridge ambient-background__ridge--left" />
        <span className="ambient-background__ridge ambient-background__ridge--right" />
        <span className="ambient-background__ridge ambient-background__ridge--bottom" />
      </div>
      <div className="ambient-background__beam ambient-background__beam--left" />
      <div className="ambient-background__beam ambient-background__beam--right" />
      <div className="ambient-background__orbit ambient-background__orbit--outer" />
      <div className="ambient-background__orbit ambient-background__orbit--inner" />
      <div className="ambient-background__grain" />
    </div>
  )
}

export default AnimatedBackground
