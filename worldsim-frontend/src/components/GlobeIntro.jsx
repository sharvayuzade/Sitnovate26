import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const SLIDES = [
  'Initializing planetary neural mesh...',
  'Mapping resource flow tensors...',
  'Calibrating autonomous state agents...',
  'Launching India Resource Nexus',
]

/* ──────────────────────────────────────────────────────────────
   Procedural Earth texture — 2048 × 1024 equirectangular
   Blue ocean + ~11 recognizable continent shapes + ice caps
   ────────────────────────────────────────────────────────────── */
function createEarthTexture() {
  const W = 2048, H = 1024
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')

  /* ocean */
  const oc = x.createLinearGradient(0, 0, 0, H)
  oc.addColorStop(0, '#0a2a55'); oc.addColorStop(0.3, '#0c3d7a')
  oc.addColorStop(0.5, '#1a5faa'); oc.addColorStop(0.7, '#0c3d7a')
  oc.addColorStop(1, '#061c3e')
  x.fillStyle = oc; x.fillRect(0, 0, W, H)

  /* ocean variation */
  for (let i = 0; i < 500; i++) {
    const px = Math.random() * W, py = Math.random() * H, r = 8 + Math.random() * 35
    const g = x.createRadialGradient(px, py, 0, px, py, r)
    g.addColorStop(0, `rgba(${10+Math.random()*20},${50+Math.random()*30},${120+Math.random()*40},0.12)`)
    g.addColorStop(1, 'transparent')
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2)
  }

  /* continent helper */
  const land = (pts, hue, l, dk) => {
    x.save(); x.beginPath(); x.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i].x + pts[i-1].x) / 2, my = (pts[i].y + pts[i-1].y) / 2
      x.quadraticCurveTo(pts[i-1].x, pts[i-1].y, mx, my)
    }
    x.closePath()
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
    const mr = Math.max(...pts.map(p => Math.hypot(p.x - cx, p.y - cy))) * 1.1
    const gr = x.createRadialGradient(cx, cy - mr * 0.15, mr * 0.05, cx, cy, mr)
    gr.addColorStop(0, `hsl(${hue},55%,${l+8}%)`)
    gr.addColorStop(0.4, `hsl(${hue+10},50%,${l}%)`)
    gr.addColorStop(0.7, `hsl(${hue+20},40%,${l-dk}%)`)
    gr.addColorStop(1, `hsl(${hue+25},35%,${l-dk-5}%)`)
    x.fillStyle = gr; x.fill()
    for (let n = 0; n < 50; n++) {
      const px2 = cx + (Math.random()-.5)*mr*1.6, py2 = cy + (Math.random()-.5)*mr*1.6
      if (x.isPointInPath(px2, py2)) {
        x.fillStyle = `rgba(${80+Math.random()*60},${100+Math.random()*60},${40+Math.random()*30},0.1)`
        x.fillRect(px2, py2, 3+Math.random()*7, 2+Math.random()*4)
      }
    }
    x.restore()
  }

  /* continents */
  land([{x:180,y:120},{x:220,y:100},{x:320,y:90},{x:380,y:110},{x:400,y:160},{x:370,y:240},{x:340,y:310},{x:310,y:350},{x:280,y:380},{x:250,y:370},{x:220,y:340},{x:200,y:300},{x:170,y:260},{x:140,y:200},{x:150,y:150}],95,38,8)
  land([{x:280,y:380},{x:310,y:370},{x:330,y:400},{x:340,y:430},{x:320,y:450},{x:300,y:460},{x:280,y:440},{x:270,y:410}],100,40,6)
  land([{x:340,y:470},{x:380,y:450},{x:420,y:460},{x:450,y:500},{x:460,y:560},{x:450,y:630},{x:430,y:700},{x:400,y:740},{x:370,y:750},{x:350,y:720},{x:330,y:660},{x:310,y:590},{x:310,y:530},{x:320,y:480}],80,42,10)
  land([{x:900,y:130},{x:960,y:110},{x:1020,y:120},{x:1060,y:140},{x:1070,y:180},{x:1040,y:220},{x:1000,y:260},{x:960,y:280},{x:920,y:260},{x:890,y:230},{x:870,y:190},{x:880,y:150}],70,40,8)
  land([{x:940,y:310},{x:990,y:290},{x:1050,y:300},{x:1090,y:340},{x:1110,y:400},{x:1120,y:480},{x:1110,y:560},{x:1080,y:630},{x:1040,y:680},{x:1000,y:700},{x:960,y:670},{x:930,y:600},{x:920,y:520},{x:910,y:440},{x:920,y:370}],40,42,12)
  land([{x:1080,y:100},{x:1180,y:80},{x:1320,y:90},{x:1440,y:120},{x:1520,y:160},{x:1560,y:220},{x:1540,y:280},{x:1480,y:340},{x:1400,y:360},{x:1350,y:380},{x:1280,y:370},{x:1200,y:340},{x:1140,y:300},{x:1100,y:240},{x:1080,y:180}],85,36,10)
  land([{x:1280,y:340},{x:1320,y:330},{x:1350,y:360},{x:1360,y:410},{x:1340,y:460},{x:1310,y:490},{x:1280,y:480},{x:1260,y:440},{x:1260,y:390}],75,44,8)
  land([{x:1440,y:360},{x:1490,y:350},{x:1530,y:380},{x:1550,y:420},{x:1530,y:450},{x:1490,y:460},{x:1450,y:440},{x:1430,y:400}],110,40,7)
  land([{x:1520,y:560},{x:1600,y:540},{x:1680,y:550},{x:1720,y:590},{x:1720,y:650},{x:1690,y:700},{x:1640,y:720},{x:1580,y:710},{x:1530,y:680},{x:1510,y:630}],35,40,10)
  land([{x:460,y:60},{x:520,y:50},{x:570,y:70},{x:580,y:110},{x:550,y:140},{x:500,y:150},{x:460,y:130},{x:440,y:95}],60,55,5)
  land([{x:200,y:960},{x:600,y:940},{x:1000,y:950},{x:1400,y:940},{x:1800,y:960},{x:1800,y:1024},{x:200,y:1024}],200,80,3)

  /* ice caps */
  const ic = x.createLinearGradient(0, 0, 0, 70)
  ic.addColorStop(0,'rgba(220,235,255,0.55)'); ic.addColorStop(1,'rgba(200,220,250,0)')
  x.fillStyle = ic; x.fillRect(0, 0, W, 70)

  /* cloud wisps */
  x.globalAlpha = 0.07
  for (let i = 0; i < 100; i++) {
    const cx2=Math.random()*W, cy2=60+Math.random()*(H-120), cr=15+Math.random()*50
    const cg=x.createRadialGradient(cx2,cy2,0,cx2,cy2,cr)
    cg.addColorStop(0,'#ffffff'); cg.addColorStop(1,'transparent')
    x.fillStyle=cg; x.beginPath()
    x.ellipse(cx2,cy2,cr*(1+Math.random()),cr*(0.3+Math.random()*0.5),Math.random()*Math.PI,0,Math.PI*2); x.fill()
  }
  x.globalAlpha = 1

  /* grid */
  x.strokeStyle = 'rgba(100,180,255,0.03)'; x.lineWidth = 0.5
  for (let lat=0;lat<H;lat+=H/18){x.beginPath();x.moveTo(0,lat);x.lineTo(W,lat);x.stroke()}
  for (let lon=0;lon<W;lon+=W/36){x.beginPath();x.moveTo(lon,0);x.lineTo(lon,H);x.stroke()}

  return new THREE.CanvasTexture(c)
}

/* Cloud layer texture */
function createCloudTexture() {
  const W = 2048, H = 1024
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')
  x.clearRect(0, 0, W, H)
  for (let i = 0; i < 300; i++) {
    const px=Math.random()*W, py=40+Math.random()*(H-80)
    const rx=20+Math.random()*80, ry=5+Math.random()*25
    const g=x.createRadialGradient(px,py,0,px,py,rx)
    g.addColorStop(0,`rgba(255,255,255,${0.15+Math.random()*0.2})`)
    g.addColorStop(0.6,`rgba(255,255,255,${0.03+Math.random()*0.06})`)
    g.addColorStop(1,'transparent')
    x.fillStyle=g; x.beginPath()
    x.ellipse(px,py,rx,ry,Math.random()*Math.PI,0,Math.PI*2); x.fill()
  }
  return new THREE.CanvasTexture(c)
}

/* ──────────────────────────────────────────────────────────────
   GlobeIntro — cinematic Earth zoom
   Camera starts far in space, slowly zooms into a rotating Earth
   with atmosphere, clouds, and stars.  Simple and guaranteed visible.
   ────────────────────────────────────────────────────────────── */
export default function GlobeIntro({ durationMs = 11000, onComplete }) {
  const mountRef = useRef(null)
  const [slideIndex, setSlideIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [fading, setFading] = useState(false)
  const startRef = useRef(Date.now())

  /* timers for slides, progress bar, fade, completion */
  useEffect(() => {
    const slideT  = setInterval(() => setSlideIndex(p => (p + 1) % SLIDES.length), 1800)
    const progT   = setInterval(() => {
      setProgress(Math.min(((Date.now() - startRef.current) / durationMs) * 100, 100))
    }, 50)
    const fadeT   = setTimeout(() => setFading(true), durationMs - 1500)
    const doneT   = setTimeout(() => { if (onComplete) onComplete() }, durationMs)
    return () => { clearInterval(slideT); clearInterval(progT); clearTimeout(fadeT); clearTimeout(doneT) }
  }, [durationMs, onComplete])

  const handleSkip = () => { setFading(true); setTimeout(() => { if (onComplete) onComplete() }, 800) }

  /* ───── Three.js scene ───── */
  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth, H = el.clientHeight

    /* renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    /* scene — pure black, no fog */
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#000000')

    /* camera — starts very far so full globe is visible as a sphere in space */
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000)
    camera.position.set(0, 0, 16)

    /* ─── LIGHTING ─── three-point cinematic */
    scene.add(new THREE.AmbientLight(0xccddff, 0.35))

    const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0)
    keyLight.position.set(5, 3, 4)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x4488cc, 0.4)
    fillLight.position.set(-4, -1, -3)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x6699cc, 0.3)
    rimLight.position.set(0, -3, 2)
    scene.add(rimLight)

    /* ─── EARTH ─── */
    const earthTex = createEarthTexture()
    earthTex.colorSpace = THREE.SRGBColorSpace
    earthTex.anisotropy = renderer.capabilities.getMaxAnisotropy()

    const earthGeo = new THREE.SphereGeometry(2, 128, 128)
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.6,
      metalness: 0.05,
      emissive: new THREE.Color('#061a3a'),
      emissiveIntensity: 0.15,
    })
    const globe = new THREE.Mesh(earthGeo, earthMat)
    globe.rotation.z = -0.41          // axial tilt
    globe.position.y = 0.4            // nudge up to clear bottom text overlay
    scene.add(globe)

    /* ─── CLOUD LAYER ─── */
    const cloudTex = createCloudTexture()
    const cloudGeo = new THREE.SphereGeometry(2.02, 64, 64)
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTex, transparent: true, opacity: 0.55,
      depthWrite: false, roughness: 1, metalness: 0,
    })
    const clouds = new THREE.Mesh(cloudGeo, cloudMat)
    clouds.rotation.z = -0.41
    clouds.position.y = 0.4
    scene.add(clouds)

    /* ─── ATMOSPHERE (Fresnel glow) ─── */
    const atmosGeo = new THREE.SphereGeometry(2.08, 64, 64)
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 mvp = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvp.xyz);
          gl_Position = projectionMatrix * mvp;
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float rim = 1.0 - max(0.0, dot(vViewDir, vNormal));
          float glow = pow(rim, 2.5) * 1.5;
          gl_FragColor = vec4(0.3, 0.6, 1.0, glow * 0.7);
        }`,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const atmos = new THREE.Mesh(atmosGeo, atmosMat)
    atmos.position.y = 0.4
    scene.add(atmos)

    /* ─── OUTER HALO ─── */
    const haloGeo = new THREE.SphereGeometry(2.35, 64, 64)
    const haloMat = new THREE.MeshBasicMaterial({
      color: '#4488cc', transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, side: THREE.BackSide,
    })
    const halo = new THREE.Mesh(haloGeo, haloMat)
    halo.position.y = 0.4
    scene.add(halo)

    /* ─── STAR FIELD ─── */
    const STARS = 4000
    const starPos = new Float32Array(STARS * 3)
    for (let i = 0; i < STARS; i++) {
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r = 60 + Math.random() * 140
      starPos[i*3]   = r * Math.sin(ph) * Math.cos(th)
      starPos[i*3+1] = r * Math.sin(ph) * Math.sin(th)
      starPos[i*3+2] = r * Math.cos(ph)
    }
    const starsGeo = new THREE.BufferGeometry()
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.12, sizeAttenuation: true,
      transparent: true, opacity: 0.85,
    })
    const starField = new THREE.Points(starsGeo, starsMat)
    scene.add(starField)

    /* ─── ANIMATION — Two-phase cinematic ─── */
    const t0 = performance.now()
    let fid
    const Z_START = 16      // far — full globe visible as sphere
    const Z_END   = 3.8     // close — fills most of frame
    const HOLD    = 0.30    // first 30% = hold far, gentle drift

    const animate = (now) => {
      const elapsed = now - t0
      const t = Math.min(elapsed / durationMs, 1)

      /* globe rotation — slow majestic spin */
      globe.rotation.y += 0.002
      clouds.rotation.y += 0.0025
      globe.rotation.x = -0.41 + Math.sin(elapsed * 0.00020) * 0.025
      atmos.rotation.y = globe.rotation.y

      /* star drift */
      starField.rotation.y += 0.00006
      starField.rotation.x += 0.00002

      const GLOBE_Y = 0.4  // match globe offset
      let camZ, camX, camY

      if (t < HOLD) {
        /* ── Phase 1: Hold far out — Earth fully visible, gentle sway ── */
        const p1 = t / HOLD  // 0→1 within phase 1
        camZ = Z_START - p1 * 1.5   // very slow creep 16→14.5
        camX = Math.sin(elapsed * 0.00012) * 0.35
        camY = GLOBE_Y + Math.cos(elapsed * 0.00015) * 0.15
      } else {
        /* ── Phase 2: Cinematic zoom approach ── */
        const p2 = (t - HOLD) / (1 - HOLD)   // 0→1 within phase 2
        /* smooth-step easing: slow start, accelerate middle, gentle arrival */
        const e = p2 * p2 * (3 - 2 * p2)
        camZ = (Z_START - 1.5) - e * (Z_START - 1.5 - Z_END)  // 14.5 → 3.8
        /* orbital drift shrinks as we get closer */
        const drift = 1 - e * 0.85
        camX = Math.sin(elapsed * 0.00018) * 0.3 * drift
        camY = GLOBE_Y + Math.cos(elapsed * 0.00022) * 0.12 * drift
      }

      camera.position.set(camX, camY, camZ)
      camera.lookAt(0, GLOBE_Y, 0)

      /* halo pulse */
      haloMat.opacity = 0.04 + Math.sin(elapsed * 0.0012) * 0.025

      renderer.render(scene, camera)
      fid = requestAnimationFrame(animate)
    }
    fid = requestAnimationFrame(animate)

    /* resize */
    const onResize = () => {
      const nw = el.clientWidth, nh = el.clientHeight
      camera.aspect = nw / nh; camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    /* cleanup */
    return () => {
      cancelAnimationFrame(fid)
      window.removeEventListener('resize', onResize)
      earthGeo.dispose(); earthMat.dispose(); earthTex.dispose()
      cloudGeo.dispose(); cloudMat.dispose(); cloudTex.dispose()
      atmosGeo.dispose(); atmosMat.dispose()
      haloGeo.dispose(); haloMat.dispose()
      starsGeo.dispose(); starsMat.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [durationMs])

  return (
    <div className={`intro-screen ${fading ? 'intro-fading' : ''}`}>
      <div ref={mountRef} className="intro-canvas" />
      <div className="intro-overlay" />
      <div className="intro-copy">
        <p className="intro-tag">India Resource Nexus</p>
        <h1>Planetary Strategy Intelligence</h1>
        <p className="intro-slide" key={slideIndex}>{SLIDES[slideIndex]}</p>
      </div>
      <div className="intro-progress" style={{ width: `${progress}%` }} />
      <button className="intro-skip" type="button" onClick={handleSkip}>Skip intro</button>
    </div>
  )
}