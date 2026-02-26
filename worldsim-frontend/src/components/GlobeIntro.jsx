import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const SLIDES = [
  'Modeling a living planet...',
  'Tracking finite resource stress...',
  'Learning autonomous regional strategy...',
  'Opening WorldSim Command Center',
]

function createEarthTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height)
  ocean.addColorStop(0, '#0b3a82')
  ocean.addColorStop(0.5, '#1d63bf')
  ocean.addColorStop(1, '#042856')
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const drawContinent = (x, y, rx, ry, rot, hueShift = 0) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    const land = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.max(rx, ry))
    land.addColorStop(0, `hsl(${118 + hueShift}, 45%, 48%)`)
    land.addColorStop(0.6, `hsl(${102 + hueShift}, 48%, 36%)`)
    land.addColorStop(1, `hsl(${95 + hueShift}, 40%, 28%)`)
    ctx.fillStyle = land
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawContinent(180, 180, 130, 90, 0.4)
  drawContinent(310, 260, 150, 70, -0.2, -10)
  drawContinent(560, 180, 120, 80, 0.1, 8)
  drawContinent(700, 280, 140, 90, -0.5, 4)
  drawContinent(860, 190, 90, 50, 0.2, -4)

  for (let i = 0; i < 300; i += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const alpha = 0.06 + Math.random() * 0.07
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.fillRect(x, y, 3 + Math.random() * 6, 1 + Math.random() * 2)
  }

  return new THREE.CanvasTexture(canvas)
}

export default function GlobeIntro({ durationMs = 8500, onComplete }) {
  const mountRef = useRef(null)
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length)
    }, 1700)

    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete()
    }, durationMs)

    return () => {
      clearInterval(slideTimer)
      clearTimeout(completeTimer)
    }
  }, [durationMs, onComplete])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000)
    camera.position.set(0, 0.2, 7)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0x7dd3fc, 0.7)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xbfe8ff, 1.2)
    keyLight.position.set(4, 2, 3)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x7c3aed, 0.7)
    rimLight.position.set(-3, -2, -4)
    scene.add(rimLight)

    const earthTexture = createEarthTexture()
    earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()

    const sphereGeo = new THREE.SphereGeometry(1.8, 128, 128)
    const sphereMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.72,
      metalness: 0.12,
      emissive: new THREE.Color('#031a34'),
      emissiveIntensity: 0.35,
    })
    const globe = new THREE.Mesh(sphereGeo, sphereMat)
    scene.add(globe)

    const atmosphereGeo = new THREE.SphereGeometry(1.93, 64, 64)
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: '#60a5fa',
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    })
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat)
    scene.add(atmosphere)

    const starsGeo = new THREE.BufferGeometry()
    const starsCount = 1800
    const positions = new Float32Array(starsCount * 3)
    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 90
      positions[i + 1] = (Math.random() - 0.5) * 90
      positions[i + 2] = (Math.random() - 0.5) * 90
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const starsMat = new THREE.PointsMaterial({
      color: '#f8fafc',
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    })
    const starField = new THREE.Points(starsGeo, starsMat)
    scene.add(starField)

    const startTime = performance.now()
    let frameId

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / durationMs, 1)

      globe.rotation.y += 0.0045
      globe.rotation.x = Math.sin(elapsed * 0.00045) * 0.08
      atmosphere.rotation.y -= 0.0016
      starField.rotation.y += 0.00018

      camera.position.z = 7 - progress * 4.7
      camera.position.x = Math.sin(elapsed * 0.00035) * 0.38
      camera.position.y = 0.2 + Math.cos(elapsed * 0.00043) * 0.18
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      sphereGeo.dispose()
      sphereMat.dispose()
      atmosphereGeo.dispose()
      atmosphereMat.dispose()
      starsGeo.dispose()
      starsMat.dispose()
      earthTexture.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [durationMs])

  return (
    <div className="intro-screen">
      <div ref={mountRef} className="intro-canvas" />
      <div className="intro-overlay" />
      <div className="intro-copy">
        <p className="intro-tag">WorldSim</p>
        <h1>Planetary Strategy Intelligence</h1>
        <p className="intro-slide">{SLIDES[slideIndex]}</p>
      </div>
      <button className="intro-skip" type="button" onClick={onComplete}>
        Skip intro
      </button>
    </div>
  )
}
