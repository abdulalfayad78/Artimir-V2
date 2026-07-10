import useTranslation from '../i18n/useTranslation'

function CameraSelector({
  cameras,
  onChange,
  selectedDeviceId,
}) {
  const { t } = useTranslation()

  return (
    <label className="camera-selector">
      <span>{t('positioning.cameraSelector.label')}</span>
      <select
        value={selectedDeviceId || ''}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">
          {t('positioning.cameraSelector.defaultCamera')}
        </option>
        {cameras.map((camera, index) => (
          <option value={camera.deviceId} key={camera.deviceId}>
            {camera.label ||
              t('positioning.cameraSelector.cameraNumber', {
                number: index + 1,
              })}
          </option>
        ))}
      </select>
    </label>
  )
}

export default CameraSelector
