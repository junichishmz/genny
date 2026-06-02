import React, { useState } from 'react'
import { useGennyStore } from '../../store/gennyStore'
import { gennyTemplates } from '../../templates/gennyTemplates'

const PLAYBACK_TOGGLE_EVENT = 'genny:playback-toggle'
const PLAYBACK_UPDATE_EVENT = 'genny:playback-update'

const projectLinks = [
  {
    label: 'Genny repo',
    url: 'https://github.com/junichishmz/genny',
  },
  {
    label: 'Strudel',
    url: 'https://strudel.cc/',
  },
]

const Header: React.FC = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(gennyTemplates[0].id)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { isPlaying, isExecuting, setCode } = useGennyStore(state => ({
    isPlaying: state.systemStatus.isPlaying,
    isExecuting: state.isExecuting,
    setCode: state.setCode
  }))

  const handleTemplateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const template = gennyTemplates.find(item => item.id === event.target.value)
    if (!template) return

    setSelectedTemplateId(template.id)
    setCode(template.code)
  }

  const handlePlaybackToggle = () => {
    window.dispatchEvent(new CustomEvent(PLAYBACK_TOGGLE_EVENT))
  }

  const handleUpdate = () => {
    window.dispatchEvent(new CustomEvent(PLAYBACK_UPDATE_EVENT))
  }

  return (
    <>
      <div className="header">
        <div className="header-left">
          <h1 className="title">Genny Strudel</h1>
        </div>
        
        <div className="header-controls">
          <button className="button-30" onClick={handlePlaybackToggle} disabled={isExecuting}>
            {isPlaying ? 'Stop' : 'Start'}
          </button>
          <button className="button-30" onClick={handleUpdate} disabled={isExecuting}>
            Update
          </button>
          <label className="template-picker">
            <span>Template</span>
            <select value={selectedTemplateId} onChange={handleTemplateChange}>
              {gennyTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>
          <button className="button-30" onClick={() => setIsSettingsOpen(true)}>
            Links
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="settings-header">
              <h2 id="settings-title">Links</h2>
              <button className="modal-close" onClick={() => setIsSettingsOpen(false)} aria-label="Close settings">
                X
              </button>
            </div>

            <section className="settings-section">
              <h3>Links</h3>
              <div className="settings-links">
                {projectLinks.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
              <p className="settings-credit">
                Genny Strudel uses Strudel for pattern notation and runtime behavior; please credit Strudel when sharing related work.
              </p>
            </section>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
