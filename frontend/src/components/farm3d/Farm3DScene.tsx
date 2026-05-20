import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Sky, Stars, Html, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useFarmStore, CROP_TYPES, type CropPlot } from './farmStore'

type WeatherMode = 'sunny' | 'cloudy' | 'rainy' | 'night'

function getWeatherMode(condition?: string, isNight?: boolean): WeatherMode {
  if (isNight) return 'night'
  const value = (condition || '').toLowerCase()
  if (value.includes('rain') || value.includes('drizzle') || value.includes('storm')) return 'rainy'
  if (value.includes('cloud') || value.includes('overcast') || value.includes('fog')) return 'cloudy'
  return 'sunny'
}

// Enhanced Crop Plant Model
function CropPlant({
  crop,
  isSelected,
  onClick,
  onPointerDown,
  showResizeHandles,
  onResizeHandleActivate,
}: {
  crop: CropPlot
  isSelected: boolean
  onClick: () => void
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void
  showResizeHandles: boolean
  onResizeHandleActivate: (direction: 'north' | 'south' | 'west' | 'east') => void
}) {
  const meshRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const cropData = CROP_TYPES[crop.cropType] || CROP_TYPES.rice
  const color = new THREE.Color(cropData.color)
  const fruitColor = cropData.fruitColor ? new THREE.Color(cropData.fruitColor) : color

  // Animate plants with realistic sway
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5 + crop.x * 0.5) * 0.15

      // Wind effect based on position
      const windOffset = Math.sin(state.clock.elapsedTime * 2 + crop.z) * 0.1
      meshRef.current.rotation.z = windOffset
    }
  })

  // Dynamic sizing based on stage
  const stageConfig = useMemo(() => {
    switch (crop.stage) {
      case 'seedling': return { scale: 0.3, height: 0.4 }
      case 'vegetative': return { scale: 0.6, height: 0.8 }
      case 'flowering': return { scale: 0.8, height: 1.2 }
      case 'fruiting': return { scale: 1.0, height: 1.4 }
      case 'harvest': return { scale: 1.1, height: 1.5 }
      default: return { scale: 0.5, height: 0.6 }
    }
  }, [crop.stage])

  // Generate plant positions in a grid
  const plantPositions = useMemo(() => {
    const positions: { x: number; z: number }[] = []
    const spacing = 1.2
    const cols = Math.floor(crop.width / spacing)
    const rows = Math.floor(crop.depth / spacing)

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        positions.push({
          x: -crop.width / 2 + spacing / 2 + i * spacing,
          z: -crop.depth / 2 + spacing / 2 + j * spacing,
        })
      }
    }
    return positions
  }, [crop.width, crop.depth])

  // Small stones / soil details for realism
  const soilStones = useMemo(() => {
    const count = Math.max(3, Math.floor((crop.width * crop.depth) / 1.5))
    const arr: { x: number; z: number; scale: number; color: string }[] = []
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * crop.width * 0.8,
        z: (Math.random() - 0.5) * crop.depth * 0.8,
        scale: 0.05 + Math.random() * 0.12,
        color: Math.random() > 0.6 ? '#BDBDBD' : (Math.random() > 0.5 ? '#8D6E63' : '#A1887F')
      })
    }
    return arr
  }, [crop.width, crop.depth])

  // Health-based color adjustment
  const healthColor = useMemo(() => {
    if (crop.health > 80) return color
    if (crop.health > 50) return color.clone().lerp(new THREE.Color('#8B4513'), 0.3)
    return new THREE.Color('#8B4513')
  }, [crop.health, color])

  return (
    <group
      ref={meshRef}
      position={[crop.x, 0, crop.z]}
      onPointerDown={(e) => {
        e.stopPropagation()
        onPointerDown(e)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Soil/Ground base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[crop.width + 0.1, crop.depth + 0.1, 0.15]} />
        <meshStandardMaterial color="#3E2723" roughness={0.95} />
      </mesh>

      {/* Dirt texture layer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <boxGeometry args={[crop.width, crop.depth, 0.08]} />
        <meshStandardMaterial color="#5D4037" roughness={1} />
      </mesh>

      {/* Selection/hover highlight */}
      {(isSelected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
          <boxGeometry args={[crop.width + 0.3, crop.depth + 0.3, 0.05]} />
          <meshStandardMaterial
            color={isSelected ? '#10B981' : '#3B82F6'}
            emissive={isSelected ? '#10B981' : '#3B82F6'}
            emissiveIntensity={isSelected ? 0.5 : 0.2}
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* Grid of plants */}
      {plantPositions.map((pos, idx) => (
        <group key={idx} position={[pos.x, 0, pos.z]}>
          {/* Main stem */}
          <mesh position={[0, stageConfig.height / 2, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.06, stageConfig.height, 8]} />
            <meshStandardMaterial color={healthColor} roughness={0.8} />
          </mesh>

          {/* Leaves - more detailed */}
          {[0, 1, 2, 3].map((k) => (
            <group key={k} position={[0, 0.2 + k * stageConfig.height * 0.25, 0]}>
              <mesh
                rotation={[0.3, k * Math.PI / 2, 0.2]}
                position={[0.15, 0, 0]}
              >
                <boxGeometry args={[0.3, 0.02, 0.15]} />
                <meshStandardMaterial color={healthColor} roughness={0.7} />
              </mesh>
              <mesh
                rotation={[0.3, k * Math.PI / 2 + Math.PI, -0.2]}
                position={[-0.15, 0, 0]}
              >
                <boxGeometry args={[0.3, 0.02, 0.15]} />
                <meshStandardMaterial color={healthColor} roughness={0.7} />
              </mesh>
            </group>
          ))}

          {/* Fruits for fruiting/harvest stage */}
          {(crop.stage === 'fruiting' || crop.stage === 'harvest') && (
            <mesh position={[0.1, stageConfig.height * 0.6, 0.1]} castShadow>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial color={fruitColor} roughness={0.3} />
            </mesh>
          )}

          {/* Flowers for flowering stage */}
          {crop.stage === 'flowering' && (
            <mesh position={[0, stageConfig.height * 0.8, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} />
            </mesh>
          )}
        </group>
      ))}

      {/* Health indicator ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <ringGeometry args={[
          Math.max(crop.width, crop.depth) / 2 + 0.15,
          Math.max(crop.width, crop.depth) / 2 + 0.25,
          32
        ]} />
        <meshStandardMaterial
          color={crop.health > 80 ? '#10B981' : crop.health > 50 ? '#F59E0B' : '#EF4444'}
          transparent
          opacity={0.7}
        />
      </mesh>

      {isSelected && showResizeHandles && (
        <group position={[0, 0.2, 0]}>
          {[
            { direction: 'north', position: [0, 0, -crop.depth / 2 - 0.55], rotationY: 0 },
            { direction: 'south', position: [0, 0, crop.depth / 2 + 0.55], rotationY: Math.PI },
            { direction: 'west', position: [-crop.width / 2 - 0.55, 0, 0], rotationY: -Math.PI / 2 },
            { direction: 'east', position: [crop.width / 2 + 0.55, 0, 0], rotationY: Math.PI / 2 },
          ].map((handle) => (
            <group key={handle.direction} position={handle.position as [number, number, number]} rotation={[0, handle.rotationY as number, 0]}>
              <mesh
                position={[0, 0.08, 0]}
                onPointerDown={(e) => { e.stopPropagation() }}
                onClick={(e) => { e.stopPropagation(); onResizeHandleActivate(handle.direction as 'north' | 'south' | 'west' | 'east') }}
                castShadow
              >
                {/* shaft */}
                <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
                <meshStandardMaterial color="#10B981" metalness={0.3} roughness={0.6} emissive="#0ea46a" emissiveIntensity={0.2} />
              </mesh>
              <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0]} onPointerDown={(e) => e.stopPropagation()}>
                {/* arrow head */}
                <coneGeometry args={[0.07, 0.18, 12]} />
                <meshStandardMaterial color="#10B981" metalness={0.3} roughness={0.5} emissive="#0ea46a" emissiveIntensity={0.2} />
              </mesh>
              {/* invisible hit plane for easier clicking */}
              <mesh position={[0, 0.12, 0]} onPointerDown={(e) => e.stopPropagation()}>
                <boxGeometry args={[0.9, 0.12, 0.9]} />
                <meshStandardMaterial transparent opacity={0} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Crop label */}
      <Billboard position={[0, stageConfig.height + 0.5, 0]}>
        <Html center>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="px-2 py-0.5 rounded-t-lg text-[10px] font-semibold whitespace-nowrap"
              style={{
                background: isSelected ? 'rgba(16, 185, 129, 0.95)' : 'rgba(255, 99, 71, 0.92)',
                color: 'white',
                transform: 'translateY(-2px)'
              }}
            >
              {/** Day's task: prefer explicit notes, else derive sensible task */}
              {(() => {
                if (crop.notes && crop.notes.trim()) return crop.notes
                if (crop.stage === 'harvest') return 'Harvest'
                if (crop.irrigationEnabled) return 'Irrigate'
                if (crop.stage === 'fruiting') return 'Inspect/Harvest'
                return 'Monitor'
              })()}
            </div>
            <div className="px-2 py-1 rounded-b-lg text-xs font-medium whitespace-nowrap"
              style={{
                background: isSelected ? 'rgba(16, 185, 129, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                color: 'white',
              }}
            >
              {crop.name}
            </div>
          </div>
        </Html>
      </Billboard>

      {/* Small stones / soil pebbles for extra realism */}
      {soilStones.map((s, i) => (
        <mesh key={`stone-${i}`} position={[s.x, 0.085 + s.scale / 2, s.z]} castShadow>
          <sphereGeometry args={[s.scale, 8, 8]} />
          <meshStandardMaterial color={s.color} roughness={0.9} metalness={0.05} />
        </mesh>
      ))}
    </group>
  )
}

// Enhanced Ground with terrain
function Ground({ showGrid, onGroundClick }: { showGrid: boolean; onGroundClick: (point: { x: number; z: number }) => void }) {
  const isNight = useFarmStore((state) => state.isNight)

  // Animated grass
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const grassCount = 500

  const grassData = useMemo(() => {
    const data = []
    for (let i = 0; i < grassCount; i++) {
      data.push({
        x: (Math.random() - 0.5) * 45,
        z: (Math.random() - 0.5) * 45,
        scale: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      })
    }
    return data
  }, [])

  useFrame((state) => {
    if (grassRef.current) {
      const dummy = new THREE.Object3D()
      for (let i = 0; i < grassCount; i++) {
        const data = grassData[i]
        dummy.position.set(data.x, 0.05, data.z)
        dummy.scale.setScalar(data.scale * (1 + Math.sin(state.clock.elapsedTime * 2 + data.phase) * 0.1))
        dummy.rotation.y = data.phase
        dummy.updateMatrix()
        grassRef.current.setMatrixAt(i, dummy.matrix)
      }
      grassRef.current.instanceMatrix.needsUpdate = true
    }
  })

  // Ground color based on time
  const groundColor = useMemo(() => {
    if (isNight) return '#1a3a0a'
    return '#4A7C23'
  }, [isNight])

  return (
    <group>
      {/* Main ground */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          onGroundClick({ x: e.point.x, z: e.point.z })
        }}
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={groundColor} roughness={1} />
      </mesh>

      {/* Grass instances */}
      <instancedMesh ref={grassRef} args={[undefined, undefined, grassCount]}>
        <coneGeometry args={[0.03, 0.15, 4]} />
        <meshStandardMaterial color={isNight ? '#1a4a10' : '#3D6B1E'} />
      </instancedMesh>

      {/* Farm path/road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 8]}>
        <planeGeometry args={[3, 30]} />
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </mesh>

      {/* Grid overlay */}
      {showGrid && (
        <gridHelper
          args={[60, 30, '#2D5016', '#2D5016']}
          position={[0, 0.02, 0]}
        />
      )}

      {/* Farm boundary fence */}
      {[...Array(4)].map((_, i) => (
        <mesh key={i} position={i < 2 ? [i === 0 ? -12 : 12, 0.5, 0] : [0, 0.5, i === 2 ? -12 : 12]} rotation={i < 2 ? [0, 0, 0] : [0, Math.PI / 2, 0]}>
          <boxGeometry args={[24, 1, 0.1]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      ))}

      {/* Fence posts */}
      {[...Array(5)].map((_, i) => (
        <group key={`post-${i}`}>
          <mesh position={[-12 + i * 6, 0.5, -12]}>
            <boxGeometry args={[0.2, 1, 0.2]} />
            <meshStandardMaterial color="#4E342E" />
          </mesh>
          <mesh position={[-12 + i * 6, 0.5, 12]}>
            <boxGeometry args={[0.2, 1, 0.2]} />
            <meshStandardMaterial color="#4E342E" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Enhanced Weather Effects
function WeatherEffects() {
  const weather = useFarmStore((state) => state.weather)
  const isNight = useFarmStore((state) => state.isNight)
  const weatherMode = getWeatherMode(weather?.condition, isNight)
  const rainRef = useRef<THREE.LineSegments>(null)
  const cloudRef = useRef<THREE.Group>(null)

  const rainMeta = useMemo(() => {
    const count = weatherMode === 'rainy' ? 420 : 0
    const positions = new Float32Array(count * 6)
    const speeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 46
      const y = 10 + Math.random() * 16
      const z = (Math.random() - 0.5) * 46
      const length = 0.35 + Math.random() * 0.45
      const base = i * 6

      positions[base] = x
      positions[base + 1] = y
      positions[base + 2] = z
      positions[base + 3] = x + 0.02
      positions[base + 4] = y - length
      positions[base + 5] = z + 0.02
      speeds[i] = 0.14 + Math.random() * 0.12
    }

    return { count, positions, speeds }
  }, [weatherMode])

  const cloudMeta = useMemo(() => {
    const count = weatherMode === 'cloudy' ? 10 : weatherMode === 'rainy' ? 14 : weatherMode === 'sunny' ? 4 : 0
    return [...Array(count)].map((_, i) => ({
      x: Math.sin(i * 0.85) * 16 + (Math.random() - 0.5) * 3,
      y: 11 + Math.cos(i * 0.45) * 1.6 + Math.random() * 1.4,
      z: Math.cos(i * 0.8) * 14 + (Math.random() - 0.5) * 3,
      scale: weatherMode === 'rainy' ? 1.5 + Math.random() * 1.2 : weatherMode === 'cloudy' ? 1.8 + Math.random() * 1.5 : 1.1 + Math.random() * 0.7,
      drift: 0.02 + Math.random() * 0.03,
    }))
  }, [weatherMode])

  // Animate rain
  useFrame(() => {
    if (rainRef.current && weatherMode === 'rainy') {
      const positions = rainRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < rainMeta.count; i++) {
        const base = i * 6
        const speed = rainMeta.speeds[i]

        positions[base + 1] -= speed
        positions[base + 4] -= speed

        if (positions[base + 1] < 0) {
          const x = (Math.random() - 0.5) * 46
          const y = 12 + Math.random() * 12
          const z = (Math.random() - 0.5) * 46
          const length = 0.4 + Math.random() * 0.5

          positions[base] = x
          positions[base + 1] = y
          positions[base + 2] = z
          positions[base + 3] = x + 0.02
          positions[base + 4] = y - length
          positions[base + 5] = z + 0.02
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true
    }

    if (cloudRef.current && weatherMode !== 'night') {
      cloudRef.current.children.forEach((child, index) => {
        child.position.x += 0.003 + index * 0.0004
        child.rotation.z = Math.sin(Date.now() * 0.0001 + index) * 0.03
        if (child.position.x > 24) child.position.x = -24
      })
    }
  })

  if (!weather || weatherMode === 'night') return null

  // Rain effect
  if (weatherMode === 'rainy') {
    return (
      <group>
        <lineSegments ref={rainRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={rainMeta.positions.length / 3}
              array={rainMeta.positions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#9ED0FF" transparent opacity={0.65} />
        </lineSegments>

        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[48, 48]} />
          <meshStandardMaterial color="#2E5A2A" transparent opacity={0.18} roughness={1} />
        </mesh>

        <group ref={cloudRef} position={[0, 11.5, 0]}>
          {cloudMeta.map((cloud, index) => (
            <group key={index} position={[cloud.x, cloud.y, cloud.z]} scale={cloud.scale}>
              {[[-1.2, 0, 0], [0, 0.35, 0], [1.2, 0, 0], [-0.2, 0.9, 0.2], [0.9, 0.75, -0.1]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                  <sphereGeometry args={[1.7 + i * 0.08, 16, 16]} />
                  <meshStandardMaterial color="#C9D3DD" transparent opacity={0.9} roughness={1} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      </group>
    )
  }

  // Cloud effect for cloudy weather
  if (weatherMode === 'cloudy') {
    return (
      <group ref={cloudRef} position={[0, 11.5, 0]}>
        {cloudMeta.map((cloud, index) => (
          <group key={index} position={[cloud.x, cloud.y, cloud.z]} scale={cloud.scale}>
            {[[-1.5, 0.1, 0], [-0.2, 0.55, 0.1], [1.2, 0.12, 0], [0.55, 0.9, 0], [-0.7, 0.75, -0.1], [1.8, 0.35, 0.1]].map((pos, i) => (
              <mesh key={i} position={pos as [number, number, number]}>
                <sphereGeometry args={[1.5 + i * 0.06, 18, 18]} />
                <meshStandardMaterial color="#D9E2EA" transparent opacity={0.88} roughness={1} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    )
  }

  if (weatherMode === 'sunny') {
    return (
      <group ref={cloudRef} position={[0, 12, 0]}>
        <mesh position={[12, 11, -18]}>
          <sphereGeometry args={[1.4, 24, 24]} />
          <meshBasicMaterial color="#FFE08A" transparent opacity={0.95} />
        </mesh>
        {[...Array(4)].map((_, i) => (
          <group key={i} position={[
            -12 + i * 7.5,
            11.2 + Math.sin(i) * 0.4,
            -15 + Math.cos(i * 0.7) * 2,
          ]} scale={0.85 + i * 0.05}>
            {[[-1.1, 0, 0], [0, 0.35, 0], [1.2, 0.05, 0], [0.55, 0.85, 0]].map((pos, idx) => (
              <mesh key={idx} position={pos as [number, number, number]}>
                <sphereGeometry args={[1.2 + idx * 0.04, 16, 16]} />
                <meshStandardMaterial color="#FFFFFF" transparent opacity={0.28} roughness={1} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    )
  }

  return null
}

// Dynamic Lighting System
function DynamicLighting() {
  const isNight = useFarmStore((state) => state.isNight)
  const weather = useFarmStore((state) => state.weather)
  const weatherMode = getWeatherMode(weather?.condition, isNight)

  const lighting = {
    ambient: weatherMode === 'night' ? 0.12 : weatherMode === 'rainy' ? 0.42 : weatherMode === 'cloudy' ? 0.6 : 0.72,
    sun: weatherMode === 'night' ? 0.04 : weatherMode === 'rainy' ? 0.42 : weatherMode === 'cloudy' ? 0.68 : 1.15,
  }

  return (
    <>
      <ambientLight intensity={lighting.ambient} color={weatherMode === 'sunny' ? '#FFF5D7' : '#DCE7F0'} />

      <directionalLight
        position={weatherMode === 'sunny' ? [18, 24, 14] : [15, 20, 15]}
        intensity={lighting.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {weatherMode === 'sunny' && (
        <>
          <pointLight position={[14, 20, 8]} intensity={0.6} color="#FFD88A" />
          <pointLight position={[6, 18, -8]} intensity={0.22} color="#FFF2CC" />
        </>
      )}

      {weatherMode === 'cloudy' && (
        <hemisphereLight skyColor="#D7E7F7" groundColor="#3E5B2A" intensity={0.7} />
      )}

      {weatherMode === 'rainy' && (
        <hemisphereLight skyColor="#BFD0E0" groundColor="#2F4727" intensity={0.55} />
      )}

      {isNight && (
        <>
          <pointLight position={[0, 5, 0]} intensity={0.3} color="#FDE68A" />
          <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5} />
        </>
      )}
    </>
  )
}

// Camera Controller
function CameraController({ isDragging }: { isDragging: boolean }) {
  const { camera } = useThree()

  return (
    <OrbitControls
      enablePan={!isDragging}
      enableZoom={!isDragging}
      enableRotate={!isDragging}
      minDistance={3}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2 - 0.05}
      target={[0, 0, 0]}
      makeDefault
    />
  )
}

// Main 3D Scene
export function FarmScene() {
  const {
    crops,
    selectedCrop,
    selectCrop,
    showGrid,
    editMode,
    selectedTool,
    updateCrop,
    addCrop,
    removeCrop,
  } = useFarmStore()
  const weather = useFarmStore((state) => state.weather)
  const isNight = useFarmStore((state) => state.isNight)
  const weatherMode = getWeatherMode(weather?.condition, isNight)

  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef<null | {
    cropId: string
    mode: 'move' | 'resize'
    startPoint: { x: number; z: number }
    initial: { x: number; z: number; width: number; depth: number }
  }>(null)

  const clampPosition = (value: number) => Math.max(-10.5, Math.min(10.5, value))
  const clampSize = (value: number) => Math.max(1, Math.min(10, value))

  const handleCropClick = (cropId: string) => {
    if (editMode && selectedTool === 'delete') {
      removeCrop(cropId)
      if (selectedCrop === cropId) {
        selectCrop(null)
      }
      return
    }

    if (editMode || selectedCrop === cropId) {
      selectCrop(cropId === selectedCrop ? null : cropId)
    } else {
      selectCrop(cropId)
    }
  }

  const handleCropPointerDown = (crop: CropPlot, event: ThreeEvent<PointerEvent>) => {
    if (!editMode || selectedTool !== 'move') {
      return
    }

    dragState.current = {
      cropId: crop.id,
      mode: selectedTool,
      startPoint: { x: event.point.x, z: event.point.z },
      initial: {
        x: crop.x,
        z: crop.z,
        width: crop.width,
        depth: crop.depth,
      },
    }
    setIsDragging(true)
    selectCrop(crop.id)
  }

  const handleDragMove = (event: ThreeEvent<PointerEvent>) => {
    const drag = dragState.current
    if (!drag || drag.mode !== 'move') return

    const deltaX = event.point.x - drag.startPoint.x
    const deltaZ = event.point.z - drag.startPoint.z

    updateCrop(drag.cropId, {
      x: clampPosition(drag.initial.x + deltaX),
      z: clampPosition(drag.initial.z + deltaZ),
    })
  }

  const handleResizeHandleActivate = (crop: CropPlot, direction: 'north' | 'south' | 'west' | 'east') => {
    if (!editMode || selectedTool !== 'resize') {
      return
    }

    const step = 0.5
    const next = { x: crop.x, z: crop.z, width: crop.width, depth: crop.depth }

    if (direction === 'east') {
      next.width = clampSize(crop.width + step)
    }
    if (direction === 'west') {
      next.width = clampSize(crop.width + step)
      next.x = clampPosition(crop.x - step / 2)
    }
    if (direction === 'south') {
      next.depth = clampSize(crop.depth + step)
    }
    if (direction === 'north') {
      next.depth = clampSize(crop.depth + step)
      next.z = clampPosition(crop.z - step / 2)
    }

    updateCrop(crop.id, next)
    selectCrop(crop.id)
  }

  const stopDragging = () => {
    dragState.current = null
    setIsDragging(false)
  }

  const handleGroundClick = (point: { x: number; z: number }) => {
    if (!editMode) {
      selectCrop(null)
      return
    }

    if (selectedTool !== 'add') {
      if (selectedTool === 'select') {
        selectCrop(null)
      }
      return
    }

    const newId = `plot_${Date.now()}`
    const now = new Date()
    const harvest = new Date(now)
    harvest.setDate(harvest.getDate() + 90)

    addCrop({
      id: newId,
      name: `New Plot ${crops.length + 1}`,
      cropType: 'rice',
      x: clampPosition(point.x),
      z: clampPosition(point.z),
      width: 3,
      depth: 3,
      stage: 'seedling',
      health: 90,
      plantedDate: now.toISOString().slice(0, 10),
      expectedHarvest: harvest.toISOString().slice(0, 10),
      irrigationEnabled: true,
    })
    selectCrop(newId)
  }

  return (
    <Canvas
      shadows
      camera={{ position: [18, 18, 18], fov: 45 }}
      style={{ background: 'linear-gradient(to bottom, #1e3a5f, #87CEEB)' }}
    >
      <DynamicLighting />
      <fog attach="fog" args={[weatherMode === 'rainy' ? '#aebfd2' : weatherMode === 'cloudy' ? '#bcd1e4' : '#87CEEB', 24, 62]} />
      <Sky
        sunPosition={weatherMode === 'sunny' ? [100, 24, 90] : [80, 18, 70]}
        turbidity={weatherMode === 'sunny' ? 0.25 : weatherMode === 'rainy' ? 7 : 3.5}
        rayleigh={weatherMode === 'sunny' ? 1.3 : 0.9}
        mieCoefficient={weatherMode === 'rainy' ? 0.02 : 0.008}
        mieDirectionalG={weatherMode === 'sunny' ? 0.95 : 0.8}
      />
      <WeatherEffects />
      <Ground showGrid={showGrid} onGroundClick={handleGroundClick} />

      {crops.map((crop) => (
        <CropPlant
          key={crop.id}
          crop={crop}
          isSelected={selectedCrop === crop.id}
          onClick={() => handleCropClick(crop.id)}
          onPointerDown={(event) => handleCropPointerDown(crop, event)}
          showResizeHandles={selectedTool === 'resize'}
          onResizeHandleActivate={(direction) => handleResizeHandleActivate(crop, direction)}
        />
      ))}

      {isDragging && dragState.current?.mode === 'move' && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.18, 0]}
          onPointerMove={handleDragMove}
          onPointerUp={stopDragging}
          onPointerLeave={stopDragging}
        >
          <planeGeometry args={[60, 60]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      <CameraController isDragging={isDragging} />
    </Canvas>
  )
}

export default FarmScene