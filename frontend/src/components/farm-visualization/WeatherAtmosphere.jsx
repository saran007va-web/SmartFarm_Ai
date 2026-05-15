import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFarmStore } from './store'

export function WeatherEffects() {
  const { weatherMode, timeOfDay, weatherData } = useFarmStore()

  // Wind affects particle movement
  const windMultiplier = weatherData.windSpeed / 10

  return (
    <group>
      {weatherMode === 'sunny' && <Sun />}
      {weatherMode === 'cloudy' && <Clouds />}
      {(weatherMode === 'rainy' || weatherMode === 'stormy') && <Rain intensity={weatherMode === 'stormy' ? 2 : 1} windMultiplier={windMultiplier} />}
      {(timeOfDay < 6 || timeOfDay > 20) && <Fireflies />}
      {weatherMode === 'foggy' && <Fog />}
      <Atmosphere />
    </group>
  )
}

function Sun() {
  const lightRef = useRef()
  const { timeOfDay, weatherData, weatherMode } = useFarmStore()

  const sunPosition = useMemo(() => {
    const angle = ((timeOfDay - 6) / 12) * Math.PI
    return [Math.cos(angle) * 50, Math.sin(angle) * 50, 20]
  }, [timeOfDay])

  const sunIntensity = useMemo(() => {
    if (timeOfDay < 6 || timeOfDay > 18) return 0
    const base = Math.sin(((timeOfDay - 6) / 12) * Math.PI)
    // Cloud cover reduces sun intensity
    const cloudFactor = 1 - (weatherData.cloudCover / 100) * 0.8
    return base * cloudFactor
  }, [timeOfDay, weatherData.cloudCover])

  // Hide sun in certain weather modes
  const isVisible = weatherMode !== 'rainy' && weatherMode !== 'stormy' && weatherMode !== 'foggy'

  return (
    <group>
      <directionalLight
        ref={lightRef}
        position={sunPosition}
        intensity={sunIntensity * 1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {isVisible && (
        <>
          {/* Sun disc */}
          <mesh position={sunPosition}>
            <sphereGeometry args={[3, 32, 32]} />
            <meshBasicMaterial color="#ffd700" />
          </mesh>
          {/* Sun glow */}
          <mesh position={sunPosition}>
            <sphereGeometry args={[5, 32, 32]} />
            <meshBasicMaterial color="#ffed4a" transparent opacity={0.3} />
          </mesh>
        </>
      )}
    </group>
  )
}

function Clouds() {
  const cloudsRef = useRef()
  const { weatherData, timeOfDay, weatherMode } = useFarmStore()

  // Wind affects cloud movement
  const windSpeed = weatherData.windSpeed / 10

  useFrame((state) => {
    if (!cloudsRef.current) return
    const time = state.clock.elapsedTime
    cloudsRef.current.children.forEach((cloud, i) => {
      cloud.position.x += 0.005 * windSpeed * (i % 2 === 0 ? 1 : -1)
      if (cloud.position.x > 40) cloud.position.x = -40
      if (cloud.position.x < -40) cloud.position.x = 40
    })
  })

  // Number of clouds based on cloud cover
  const cloudCount = Math.ceil(weatherData.cloudCover / 25)

  const cloudPositions = useMemo(() => {
    const positions = []
    for (let i = 0; i < 4; i++) {
      positions.push([
        (Math.random() - 0.5) * 50,
        15 + Math.random() * 15,
        -20 + Math.random() * 40,
      ])
    }
    return positions
  }, [])

  // Only show if there's cloud cover or it's cloudy/rainy
  if (weatherData.cloudCover < 10 && weatherMode !== 'cloudy' && weatherMode !== 'rainy') return null

  return (
    <group ref={cloudsRef}>
      {cloudPositions.slice(0, cloudCount).map((pos, i) => (
        <group key={i} position={pos}>
          <Cloud opacity={0.5 + (weatherData.cloudCover / 100) * 0.5} />
        </group>
      ))}
    </group>
  )
}

function Cloud({ opacity = 0.9 }) {
  return (
    <group>
      {[0, 0.8, 1.6, -0.8].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <sphereGeometry args={[1.5 - Math.abs(x) * 0.3, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={opacity}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  )
}

function Rain({ intensity = 1, windMultiplier = 1 }) {
  const rainRef = useRef()

  const count = 500 * intensity

  // Create rain drops
  const rainDrops = useMemo(() => {
    const drops = []
    for (let i = 0; i < count; i++) {
      drops.push({
        position: [
          (Math.random() - 0.5) * 60,
          Math.random() * 30,
          (Math.random() - 0.5) * 60,
        ],
        speed: 0.3 + Math.random() * 0.3,
        xOffset: Math.random() * 0.02,
      })
    }
    return drops
  }, [count])

  useFrame(() => {
    if (!rainRef.current) return

    rainRef.current.children.forEach((drop, i) => {
      const dropSpeed = rainDrops[i].speed * intensity
      drop.position.y -= dropSpeed
      drop.position.x += rainDrops[i].xOffset * windMultiplier

      if (drop.position.y < 0) {
        drop.position.y = 30
        drop.position.x = rainDrops[i].position[0]
      }
    })
  })

  return (
    <group ref={rainRef}>
      {rainDrops.map((drop, i) => (
        <mesh key={i} position={drop.position}>
          <cylinderGeometry args={[0.02, 0.02, 0.3 * intensity, 4]} />
          <meshBasicMaterial color="#aaddff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function Fog() {
  const { weatherData } = useFarmStore()

  // Fog density based on humidity
  const fogDensity = weatherData.humidity / 100

  return (
    <group>
      {[0, 10, 20, 30].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial
            color="#94a3b8"
            transparent
            opacity={0.15 * fogDensity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function Fireflies() {
  const firefliesRef = useRef()

  const positions = useMemo(() => {
    return [...Array(20)].map(() => ({
      position: [
        (Math.random() - 0.5) * 30,
        0.5 + Math.random() * 2,
        (Math.random() - 0.5) * 30,
      ],
      phase: Math.random() * Math.PI * 2,
    }))
  }, [])

  useFrame((state) => {
    if (!firefliesRef.current) return
    const time = state.clock.elapsedTime

    firefliesRef.current.children.forEach((firefly, i) => {
      const { position, phase } = positions[i]
      firefly.position.x = position[0] + Math.sin(time * 0.5 + phase) * 0.5
      firefly.position.y = position[1] + Math.sin(time * 2 + phase) * 0.3
      firefly.position.z = position[2] + Math.cos(time * 0.5 + phase) * 0.5

      // Pulsing light
      const intensity = (Math.sin(time * 3 + phase) + 1) * 0.5
      firefly.material.emissiveIntensity = intensity
    })
  })

  return (
    <group ref={firefliesRef}>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos.position}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color="#ffff00"
            emissive="#ffff00"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

function Atmosphere() {
  const { timeOfDay, weatherMode, weatherData } = useFarmStore()

  // Fog color based on time of day
  const fogColor = useMemo(() => {
    if (timeOfDay < 6) return new THREE.Color('#1a1a2e')
    if (timeOfDay < 8) return new THREE.Color('#ffd89b')
    if (timeOfDay < 17) {
      // Cloud cover affects sky color
      if (weatherData.cloudCover > 70) return new THREE.Color('#94a3b8')
      return new THREE.Color('#87ceeb')
    }
    if (timeOfDay < 20) return new THREE.Color('#ff9966')
    return new THREE.Color('#1a1a2e')
  }, [timeOfDay, weatherData.cloudCover])

  // Weather affects fog density
  let fogNear = 20
  let fogFar = 60

  if (weatherMode === 'rainy') {
    fogNear = 10
    fogFar = 40
  } else if (weatherMode === 'foggy') {
    fogNear = 5
    fogFar = 20
  } else if (weatherMode === 'cloudy') {
    fogNear = 15
    fogFar = 50
  }

  return <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
}

export function DynamicLighting() {
  const { timeOfDay, weatherMode, weatherData } = useFarmStore()

  const ambientIntensity = useMemo(() => {
    let base = 0.5
    if (timeOfDay < 6 || timeOfDay > 20) base = 0.2
    else if (timeOfDay < 8 || timeOfDay > 18) base = 0.4

    // Cloud cover reduces intensity
    const cloudFactor = 1 - (weatherData.cloudCover / 100) * 0.4
    return base * cloudFactor
  }, [timeOfDay, weatherData.cloudCover])

  const ambientColor = useMemo(() => {
    if (timeOfDay < 6) return '#1a1a2e'
    if (timeOfDay < 8) return '#ffd89b'
    if (timeOfDay < 17) return '#ffffff'
    if (timeOfDay < 20) return '#ff9966'
    return '#1a1a2e'
  }, [timeOfDay])

  // Weather makes it darker
  let weatherMultiplier = 1
  if (weatherMode === 'rainy') weatherMultiplier = 0.5
  else if (weatherMode === 'stormy') weatherMultiplier = 0.3
  else if (weatherMode === 'cloudy') weatherMultiplier = 0.7

  return (
    <ambientLight intensity={ambientIntensity * weatherMultiplier} color={ambientColor} />
  )
}

export function Birds() {
  const birdsRef = useRef()
  const { timeOfDay, weatherMode } = useFarmStore()

  const birdPositions = useMemo(() => {
    return [...Array(8)].map(() => ({
      startX: (Math.random() - 0.5) * 40,
      startZ: (Math.random() - 0.5) * 40,
      speed: 0.02 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
    }))
  }, [])

  useFrame((state) => {
    if (!birdsRef.current) return
    const time = state.clock.elapsedTime

    birdsRef.current.children.forEach((bird, i) => {
      const { startX, startZ, speed, phase } = birdPositions[i]
      bird.position.x = startX + (time * speed * 10) % 40 - 20
      bird.position.z = startZ + Math.sin(time + phase) * 5
      bird.position.y = 15 + Math.sin(time * 2 + phase) * 2
    })
  })

  // Only show birds during day and not rainy
  if (timeOfDay < 6 || timeOfDay > 18 || weatherMode === 'rainy') return null

  return (
    <group ref={birdsRef}>
      {birdPositions.map((_, i) => (
        <mesh key={i} position={[0, 15, 0]}>
          <coneGeometry args={[0.1, 0.3, 3]} />
          <meshBasicMaterial color="#222" />
        </mesh>
      ))}
    </group>
  )
}