function ProfileChoiceGroup({
  groupNumber,
  name,
  title,
  options,
  value,
  onChange,
  variant,
  disabled = false,
}) {
  return (
    <fieldset className="profile-choice-group">
      <legend className="profile-choice-group__legend">
        <span aria-hidden="true">{groupNumber}</span>
        <span>{title}</span>
      </legend>

      <div
        className={`profile-choice-grid profile-choice-grid--${variant}`}
      >
        {options.map((option, index) => {
          const isSelected = value === option.value
          const optionId = `${name}-${option.value}`

          return (
            <label className="profile-choice" key={option.value} htmlFor={optionId}>
              <input
                className="profile-choice__input"
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
              />
              <span
                className="profile-choice__surface"
                style={{ '--option-index': index }}
              >
                <span className="profile-choice__label">{option.label}</span>
                <span className="profile-choice__state" aria-hidden="true">
                  {isSelected ? '✓' : String(index + 1).padStart(2, '0')}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default ProfileChoiceGroup
