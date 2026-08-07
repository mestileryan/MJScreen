'use client'

import { useEffect, useState } from 'react'

/**
 * Liste les sorties audio disponibles. Les libellés ne sont exposés par le navigateur
 * qu'après une autorisation d'accès aux périphériques : on ouvre donc brièvement un
 * flux micro, refermé aussitôt.
 */
export function useAudioOutputs() {
  const [outputChannels, setOutputChannels] = useState<MediaDeviceInfo[]>([])
  const [selectedOutputChannel, setSelectedOutputChannel] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: 'default' },
        })
        stream.getTracks().forEach(track => track.stop())

        const devices = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return

        const outputs = devices.filter(device => device.kind === 'audiooutput')
        setOutputChannels(outputs)
        if (outputs.length > 0) {
          // Sélectionne par défaut le premier canal de sortie
          setSelectedOutputChannel(outputs[0].deviceId)
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des dispositifs audio :', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { outputChannels, selectedOutputChannel, setSelectedOutputChannel }
}
