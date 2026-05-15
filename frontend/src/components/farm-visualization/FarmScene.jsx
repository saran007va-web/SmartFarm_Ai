import { Suspense, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useFarmStore } from './store'
import CropField from './CropField'
import { FarmTerrain, FarmBuildings, Vegetation, Drones, Tractors } from './FarmEnvironment'
import { WeatherEffects, DynamicLighting, Birds } from './WeatherAtmosphere'

function CameraController() {
  const { cameraPosition, cameraTarget, setCameraPosition } = useFarmStore()
  const controlsRef = useRef()
  const { camera } = useThree()

  useFrame(() => {
    if (controlsRef.current) {
      // Update store with current camera position
      setCameraPosition([
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ])
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minDistance={10}
      maxDistance={50}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.5}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.8}
    />
  )
}

function CropPlot({ plot, index }) {
  const meshRef = useRef()
  const { setSelectedPlot, setHoveredPlot, hoveredPlot, farmPulseMode } = useFarmStore()

  const isHovered = hoveredPlot?.id === plot.id

  useEffect(() => {
    const handlePointerOver = () => {
      document.body.style.cursor = 'pointer'
      setHoveredPlot(plot)
    }

    const handlePointerOut = () => {
      document.body.style.cursor = 'default'
      setHoveredPlot(null)
    }

    const handleClick = () => {
      setSelectedPlot(plot)
    }

    const mesh = meshRef.current
    if (mesh) {
      mesh.addEventListener('pointerover', handlePointerOver)
      mesh.addEventListener('pointerout', handlePointerOut)
      mesh.addEventListener('click', handleClick)
    }

    return () => {
      if (mesh) {
        mesh.removeEventListener('pointerover', handlePointerOver)
        mesh.removeEventListener('pointerout', handlePointerOut)
        mesh.removeEventListener('click', handleClick)
      }
    }
  }, [plot, setSelectedPlot, setHoveredPlot])

  return (
    <group
      ref={meshRef}
      position={plot.position}
      userData={{ plotId: plot.id }}
    >
      <CropField
        type={plot.type}
        position={[0, 0, 0]}
        size={plot.size}
        index={index}
      />
    </group>
  )
}

function Plots() {
  const { plots } = useFarmStore()

  return (
    <group>
      {plots.map((plot, index) => (
        <CropPlot key={plot.id} plot={plot} index={index} />
      ))}
    </group>
  )
}

function HolographicOverlay() {
  const { showGrid, farmPulseMode, timeOfDay } = useFarmStore()
  const linesRef = useRef()

  useFrame((state) => {
    if (!linesRef.current || !farmPulseMode) return
    const time = state.clock.elapsedTime

    linesRef.current.children.forEach((line, i) => {
      const pulse = Math.sin(time * 2 + i * 0.5) * 0.3 + 0.5
      line.material.opacity = pulse * 0.3
    })
  })

  return (
    <group>
      {/* Grid overlay */}
      {showGrid && (
        <gridHelper
          args={[60, 30, '#10b981', 'rgba(16, 185, 129, 0.2)']}
          position={[0, 0.1, 0]}
        />
      )}

      {/* Farm pulse effect */}
      {farmPulseMode && (
        <group ref={linesRef}>
          {[-20, -10, 0, 10, 20].map((x) => (
            <line key={`x-${x}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([x, 0.2, -30, x, 0.2, 30])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#10b981" transparent opacity={0.3} />
            </line>
          ))}
          {[-20, -10, 0, 10, 20].map((z) => (
            <line key={`z-${z}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([-30, 0.2, z, 30, 0.2, z])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#10b981" transparent opacity={0.3} />
            </line>
          ))}
        </group>
      )}
    </group>
  )
}

function Scene() {
  const { timeOfDay, weatherMode } = useFarmStore()

  // Dynamic background color based on time
  const bgColor = useMemo(() => {
    if (timeOfDay < 6) return '#0a0a1a'
    if (timeOfDay < 8) return '#1a2a3a'
    if (timeOfDay < 17) return '#1e293b'
    if (timeOfDay < 20) return '#2a1a2a'
    return '#0a0a1a'
  }, [timeOfDay])

  return (
    <>
      <PerspectiveCamera makeDefault position={[25, 25, 25]} fov={50} />
      <CameraController />
      <DynamicLighting />
      <WeatherEffects />
      <Birds />

      {/* Ambient with better color */}
      <ambientLight intensity={0.3} />

      {/* Hemisphere light for better sky/ground color */}
      <hemisphereLight
        skyColor={timeOfDay < 6 || timeOfDay > 20 ? '#1a1a3a' : '#87ceeb'}
        groundColor={timeOfDay < 6 || timeOfDay > 20 ? '#1a1a1a' : '#4a5d23'}
        intensity={0.4}
      />

      {/* Main farm group */}
      <group position={[0, 0, 0]}>
        <FarmTerrain />
        <Vegetation />
        <FarmBuildings />
        <Plots />
        <Drones />
        <Tractors />
        <HolographicOverlay />
      </group>

      {/* Sky/Stars */}
      {timeOfDay < 6 || timeOfDay > 20 ? (
        <Stars
          radius={100}
          depth={50}
          count={2000}
          factor={3}
          saturation={0}
          fade
          speed={0.5}
        />
      ) : (
        // Day sky with sun direction indicator
        <mesh position={[50, 30, -50]}>
          <sphereGeometry args={[5, 16, 16]} />
          <meshBasicMaterial color="#ffdd88" />
        </mesh>
      )}
    </>
  )
}

export default function FarmScene() {
  const { timeOfDay } = useFarmStore()

  // Dynamic background
  const bgColor = useMemo(() => {
    if (timeOfDay < 6) return '#0a0a1a'
    if (timeOfDay < 8) return '#1a2a3a'
    if (timeOfDay < 17) return '#1e293b'
    if (timeOfDay < 20) return '#2a1a2a'
    return '#0a0a1a'
  }, [timeOfDay])

  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: 3, // ACESFilmicToneMapping for better HDR
        toneMappingExposure: 1.2,
      }}
      dpr={[1, 2]}
      style={{ background: bgColor }}
    >
      <Suspense fallback={<Html center><Loading3D /></Html>}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}

function Loading3D() {
  return (
    <div
      className="p-6 rounded-2xl text-center"
      style={{
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="w-10 h-10 mx-auto mb-3 rounded-lg border-2 border-t-transparent animate-spin"
        style={{ borderTopColor: '#10b981' }}
      />
      <p className="text-sm" style={{ color: '#94a3b8' }}>Loading 3D Environment...</p>
    </div>
  )
}