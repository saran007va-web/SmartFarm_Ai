import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFarmStore } from './store'

export function FarmTerrain() {
  const meshRef = useRef()
  const { timeOfDay, weatherMode, weatherData } = useFarmStore()

  // Terrain color based on time of day and weather
  const terrainColor = useMemo(() => {
    const dayFactor = Math.sin((timeOfDay / 24) * Math.PI)
    let baseColor = new THREE.Color('#4a5d23').lerp(new THREE.Color('#6b8e23'), dayFactor)

    // Weather affects terrain - rainy makes it darker
    if (weatherMode === 'rainy' || weatherMode === 'stormy') {
      baseColor = baseColor.clone().multiplyScalar(0.7)
    }
    // Hot temperature makes it dryer looking
    if (weatherData.temperature > 30) {
      baseColor = baseColor.clone().lerp(new THREE.Color('#8b7355'), 0.3)
    }

    return baseColor
  }, [timeOfDay, weatherMode, weatherData.temperature])

  // Path color - slightly wet when rainy
  const pathColor = useMemo(() => {
    return weatherMode === 'rainy' ? new THREE.Color('#6b5344') : new THREE.Color('#8b7355')
  }, [weatherMode])

  return (
    <group>
      {/* Main ground with slight elevation */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 60, 128, 128]} />
        <meshStandardMaterial
          color={terrainColor}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Grass patches for realism */}
      <GrassPatches />

      {/* Dirt paths */}
      {[
        { pos: [0, -0.05, 0], size: [40, 2] },
        { pos: [-12, -0.05, 6], size: [2, 20] },
        { pos: [12, -0.05, -2], size: [2, 16] },
      ].map((path, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={path.pos}
          receiveShadow
        >
          <planeGeometry args={path.size} />
          <meshStandardMaterial color={pathColor} roughness={1} />
        </mesh>
      ))}

      {/* Water canal with animated surface */}
      <WaterCanal />

      {/* Reservoir */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[18, -0.08, 12]}
      >
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial
          color="#1e90ff"
          metalness={0.8}
          roughness={0.15}
        />
      </mesh>

      {/* Rocks for realism */}
      <Rocks />
    </group>
  )
}

function GrassPatches() {
  const { timeOfDay, weatherMode } = useFarmStore()

  const grassPositions = useMemo(() => {
    const positions = []
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * 50
      const z = (Math.random() - 0.5) * 50
      // Avoid placing grass on paths and water
      if (Math.abs(x) > 3 && Math.abs(z) > 3 && Math.abs(x + 12) > 3 && Math.abs(z - 6) > 3) {
        positions.push({
          position: [x, 0, z],
          scale: 0.5 + Math.random() * 0.5,
        })
      }
    }
    return positions
  }, [])

  const grassColor = useMemo(() => {
    if (timeOfDay < 6 || timeOfDay > 20) return new THREE.Color('#2d4a1c')
    if (timeOfDay < 8 || timeOfDay > 18) return new THREE.Color('#4a7c2a')
    return new THREE.Color('#5a9c3a')
  }, [timeOfDay])

  return (
    <group>
      {grassPositions.slice(0, 50).map((pos, i) => (
        <mesh key={i} position={pos.position} scale={pos.scale}>
          <coneGeometry args={[0.05, 0.2, 4]} />
          <meshStandardMaterial color={grassColor} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function WaterCanal() {
  const { weatherMode } = useFarmStore()
  const waterRef = useRef()

  // Animate water when it's raining
  useFrame((state) => {
    if (!waterRef.current) return
    if (weatherMode === 'rainy') {
      waterRef.current.material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  const isRainy = weatherMode === 'rainy' || weatherMode === 'stormy'

  return (
    <group>
      {/* Canal edges */}
      <mesh position={[-21.5, 0.1, 0]}>
        <boxGeometry args={[0.5, 0.3, 35]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
      </mesh>
      <mesh position={[-18.5, 0.1, 0]}>
        <boxGeometry args={[0.5, 0.3, 35]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
      </mesh>

      {/* Water surface */}
      <mesh
        ref={waterRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-20, -0.05, 0]}
      >
        <planeGeometry args={[3, 35]} />
        <meshStandardMaterial
          color={isRainy ? '#3a6a9b' : '#4682b4'}
          metalness={0.7}
          roughness={0.2}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  )
}

function Rocks() {
  const rockPositions = useMemo(() => {
    return [
      [-25, 0.2, -15],
      [25, 0.15, 15],
      [-20, 0.25, 20],
      [15, 0.2, -20],
    ]
  }, [])

  return (
    <group>
      {rockPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <dodecahedronGeometry args={[0.5 + Math.random() * 0.3, 0]} />
          <meshStandardMaterial color="#6a6a6a" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

export function FarmBuildings() {
  const { selectedPlot, hoveredPlot, plots, timeOfDay } = useFarmStore()

  const buildings = [
    { pos: [-18, 0, -12], type: 'farmhouse', size: [4, 3, 4] },
    { pos: [22, 0, -8], type: 'storage', size: [6, 4, 8] },
    { pos: [15, 0, -15], type: 'solar-pump', size: [2, 3, 2] },
    { pos: [-22, 0, 8], type: 'well', size: [1, 1, 1] },
  ]

  return (
    <group>
      {buildings.map((building, i) => (
        <group key={i} position={building.pos}>
          {building.type === 'farmhouse' && (
            <group>
              {/* Main house */}
              <mesh position={[0, 1.5, 0]} castShadow>
                <boxGeometry args={building.size} />
                <meshStandardMaterial color="#f5f5dc" roughness={0.8} />
              </mesh>
              {/* Roof */}
              <mesh position={[0, 3.5, 0]} castShadow>
                <coneGeometry args={[3, 2, 4]} />
                <meshStandardMaterial color="#8b4513" roughness={0.9} />
              </mesh>
              {/* Windows with glow at night */}
              <mesh position={[0, 1.5, 2.01]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial
                  color={timeOfDay < 6 || timeOfDay > 20 ? '#ffddaa' : '#f5f5dc'}
                  emissive={timeOfDay < 6 || timeOfDay > 20 ? '#ffaa55' : '#000000'}
                  emissiveIntensity={timeOfDay < 6 || timeOfDay > 20 ? 0.3 : 0}
                />
              </mesh>
            </group>
          )}

          {building.type === 'storage' && (
            <group>
              <mesh position={[0, 2, 0]} castShadow>
                <boxGeometry args={building.size} />
                <meshStandardMaterial color="#a0a0a0" roughness={0.7} metalness={0.3} />
              </mesh>
              {/* Door */}
              <mesh position={[0, 1, 4.01]}>
                <planeGeometry args={[1.5, 2]} />
                <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
              </mesh>
            </group>
          )}

          {building.type === 'solar-pump' && (
            <group>
              {/* Solar panel */}
              <mesh position={[0, 3, 0]} rotation={[0, 0, Math.PI / 6]}>
                <boxGeometry args={[2.5, 0.05, 1.5]} />
                <meshStandardMaterial
                  color="#1a1a8a"
                  metalness={0.9}
                  roughness={0.1}
                />
              </mesh>
              {/* Pole */}
              <mesh position={[0, 1.5, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
                <meshStandardMaterial color="#333" metalness={0.5} />
              </mesh>
              {/* Pump housing */}
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[0.8, 0.6, 0.8]} />
                <meshStandardMaterial color="#4a90d9" metalness={0.6} roughness={0.4} />
              </mesh>
              {/* Status LED */}
              <mesh position={[0, 0.5, 0.41]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial
                  color="#00ff00"
                  emissive="#00ff00"
                  emissiveIntensity={0.8}
                />
              </mesh>
            </group>
          )}

          {building.type === 'well' && (
            <group>
              {/* Well base */}
              <mesh position={[0, 0.4, 0]} castShadow>
                <cylinderGeometry args={[1, 1.2, 0.8, 16]} />
                <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
              </mesh>
              {/* Water */}
              <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.9, 16]} />
                <meshStandardMaterial
                  color="#2a5a8a"
                  metalness={0.7}
                  roughness={0.2}
                />
              </mesh>
              {/* Roof supports */}
              <mesh position={[-0.6, 1.2, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
                <meshStandardMaterial color="#5a4a3a" />
              </mesh>
              <mesh position={[0.6, 1.2, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
                <meshStandardMaterial color="#5a4a3a" />
              </mesh>
              {/* Roof */}
              <mesh position={[0, 2, 0]} rotation={[0, 0, Math.PI / 4]}>
                <coneGeometry args={[1, 0.8, 4]} />
                <meshStandardMaterial color="#8b4513" roughness={0.9} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* Smart sensor poles */}
      {plots.map((plot, i) => (
        <group key={`sensor-${i}`} position={[plot.position[0] + plot.size[0] / 2 + 1, 0, plot.position[2]]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 3, 8]} />
            <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Sensor head */}
          <mesh position={[0, 3.1, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color="#00ff88"
              emissive="#00ff88"
              emissiveIntensity={selectedPlot?.id === plot.id || hoveredPlot?.id === plot.id ? 1 : 0.3}
            />
          </mesh>
          {/* Signal rings */}
          <SensorPulse isActive={selectedPlot?.id === plot.id || hoveredPlot?.id === plot.id} />
        </group>
      ))}
    </group>
  )
}

function SensorPulse({ isActive }) {
  const ringRef = useRef()

  useFrame((state) => {
    if (!ringRef.current || !isActive) return
    const time = state.clock.elapsedTime
    const scale = (time % 2) * 1.5
    ringRef.current.scale.set(scale, scale, scale)
    ringRef.current.material.opacity = 1 - (time % 2) / 2
  })

  if (!isActive) return null

  return (
    <mesh ref={ringRef} position={[0, 3.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.2, 0.25, 32]} />
      <meshBasicMaterial color="#00ff88" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function Vegetation() {
  const { timeOfDay } = useFarmStore()

  // Random trees around the farm
  const treePositions = useMemo(() => {
    const positions = []
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      const radius = 25 + Math.random() * 5
      positions.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.8 + Math.random() * 0.5,
      })
    }
    return positions
  }, [])

  return (
    <group>
      {treePositions.map((pos, i) => (
        <group key={i} position={[pos.x, 0, pos.z]} scale={pos.scale}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 1.6, 8]} />
            <meshStandardMaterial color="#4a3728" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2, 0]} castShadow>
            <coneGeometry args={[0.8, 2, 8]} />
            <meshStandardMaterial
              color={new THREE.Color('#2d5016').lerp(new THREE.Color('#3d7020'), Math.sin(timeOfDay / 24 * Math.PI))}
              roughness={0.8}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Drones() {
  const droneRef = useRef()
  const { timeOfDay, weatherMode } = useFarmStore()

  useFrame((state) => {
    if (!droneRef.current) return
    const time = state.clock.elapsedTime

    // Circular flight path
    droneRef.current.position.x = Math.cos(time * 0.3) * 15
    droneRef.current.position.z = Math.sin(time * 0.3) * 15
    droneRef.current.position.y = 8 + Math.sin(time * 0.5) * 1

    // Rotate to face direction of movement
    droneRef.current.rotation.y = time * 0.3 + Math.PI / 2
  })

  // Only show drone during day
  if (timeOfDay < 6 || timeOfDay > 18 || weatherMode === 'rainy') return null

  return (
    <group ref={droneRef} position={[15, 8, 0]}>
      {/* Drone body */}
      <mesh>
        <boxGeometry args={[0.6, 0.15, 0.4]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Propellers */}
      {[[0.3, 0, 0.2], [-0.3, 0, 0.2], [0.3, 0, -0.2], [-0.3, 0, -0.2]].map((pos, i) => (
        <group key={i} position={pos}>
          <mesh rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
            <meshStandardMaterial color="#333" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
      {/* Camera */}
      <mesh position={[0, -0.1, -0.25]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      {/* LED light */}
      <pointLight color="#00ff00" intensity={0.5} distance={3} />
    </group>
  )
}

export function Tractors() {
  const tractorRef = useRef()

  useFrame((state) => {
    if (!tractorRef.current) return
    const time = state.clock.elapsedTime

    // Slow patrol movement
    const t = (time * 0.1) % 20
    tractorRef.current.position.x = -15 + t
    tractorRef.current.position.z = 15 - Math.sin(t * 0.3) * 3
    tractorRef.current.rotation.y = Math.sin(t * 0.1) * 0.2
  })

  return (
    <group ref={tractorRef} position={[-15, 0, 15]}>
      {/* Main body */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.5, 0.8, 2.5]} />
        <meshStandardMaterial color="#ff6b00" roughness={0.7} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.2, -0.3]}>
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Wheels */}
      {[
        [0.7, 0.3, 0.8],
        [-0.7, 0.3, 0.8],
        [0.7, 0.3, -0.8],
        [-0.7, 0.3, -0.8],
      ].map((pos, i) => (
        <mesh key={i} position={pos} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}