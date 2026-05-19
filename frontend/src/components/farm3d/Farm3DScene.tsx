import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sky, Stars, Text, Html, useGLTF, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useFarmStore, CROP_TYPES, type CropPlot } from './farmStore'

// Enhanced Crop Plant Model
function CropPlant({ crop, isSelected, onClick, editMode }: { crop: CropPlot; isSelected: boolean; onClick: () => void; editMode: boolean }) {
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
function Ground({ showGrid }: { showGrid: boolean }) {
  const time = useFarmStore((state) => state.currentTime)
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
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
  const rainRef = useRef<THREE.Points>(null)

  // Animate rain
  useFrame(() => {
    if (rainRef.current) {
      const positions = rainRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.3
        if (positions[i + 1] < 0) {
          positions[i + 1] = 15
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  if (!weather || isNight) return null

  const condition = weather.condition.toLowerCase()

  // Rain effect
  if (condition.includes('rain') || condition.includes('drizzle')) {
    const rainCount = 2000
    const positions = new Float32Array(rainCount * 3)
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40
      positions[i * 3 + 1] = Math.random() * 15
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40
    }

    return (
      <points ref={rainRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={rainCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#6495ED" size={0.08} transparent opacity={0.5} />
      </points>
    )
  }

  // Cloud effect for cloudy weather
  if (condition.includes('cloud') || condition.includes('overcast')) {
    return (
      <group position={[0, 12, 0]}>
        {[...Array(8)].map((_, i) => (
          <mesh key={i} position={[
            Math.sin(i * 0.8) * 10,
            Math.cos(i * 0.5) * 2,
            Math.cos(i * 0.8) * 10
          ]}>
            <sphereGeometry args={[2 + Math.random() * 2, 16, 16]} />
            <meshStandardMaterial
              color="#9CA3AF"
              transparent
              opacity={0.6}
            />
          </mesh>
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

  const isCloudy = weather?.condition.toLowerCase().includes('cloud')

  return (
    <>
      <ambientLight intensity={isNight ? 0.15 : isCloudy ? 0.6 : 0.5} />

      <directionalLight
        position={[15, 20, 15]}
        intensity={isNight ? 0.05 : isCloudy ? 0.6 : 1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

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
function CameraController() {
  const { camera } = useThree()

  return (
    <OrbitControls
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
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
  const { crops, selectedCrop, selectCrop, showGrid, editMode, setEditMode } = useFarmStore()

  const handleCropClick = (cropId: string) => {
    if (editMode || selectedCrop === cropId) {
      selectCrop(cropId === selectedCrop ? null : cropId)
    } else {
      selectCrop(cropId)
    }
  }

  return (
    <Canvas
      shadows
      camera={{ position: [18, 18, 18], fov: 45 }}
      style={{ background: 'linear-gradient(to bottom, #1e3a5f, #87CEEB)' }}
    >
      <DynamicLighting />
      <Sky
        sunPosition={[100, 20, 100]}
        turbidity={0.5}
        rayleigh={0.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <WeatherEffects />
      <Ground showGrid={showGrid} />

      {crops.map((crop) => (
        <CropPlant
          key={crop.id}
          crop={crop}
          isSelected={selectedCrop === crop.id}
          onClick={() => handleCropClick(crop.id)}
          editMode={editMode}
        />
      ))}

      <CameraController />

      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#87CEEB', 30, 60]} />
    </Canvas>
  )
}

export default FarmScene