import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFarmStore } from './store'

// Crop colors configuration
const CROP_CONFIG = {
  rice: {
    baseColor: '#8fbc8f',
    matureColor: '#9acd32',
    height: 0.3,
    reflectivity: 0.4,
  },
  wheat: {
    baseColor: '#d4a574',
    matureColor: '#daa520',
    height: 0.6,
    reflectivity: 0.1,
  },
  maize: {
    baseColor: '#228b22',
    matureColor: '#9acd32',
    height: 1.2,
    reflectivity: 0.1,
  },
  vegetables: {
    baseColor: '#32cd32',
    matureColor: '#00ff00',
    height: 0.25,
    reflectivity: 0.1,
  },
  orchard: {
    baseColor: '#2e8b57',
    matureColor: '#ff6347',
    height: 2,
    reflectivity: 0.1,
  },
  greenhouse: {
    baseColor: '#98fb98',
    matureColor: '#00fa9a',
    height: 0.8,
    reflectivity: 0.3,
  },
}

function CropMesh({ type, position, size, index }) {
  const meshRef = useRef()
  const { hoveredPlot, selectedPlot, weatherMode, timeOfDay, farmPulseMode, weatherData } = useFarmStore()

  const config = CROP_CONFIG[type] || CROP_CONFIG.vegetables
  const isHovered = hoveredPlot?.id === `${type}-field-${index + 1}` ||
    hoveredPlot?.id === `${type}-bed-${index + 1}` ||
    hoveredPlot?.id === `${type}-${index + 1}`
  const isSelected = selectedPlot?.id === `${type}-field-${index + 1}` ||
    selectedPlot?.id === `${type}-bed-${index + 1}` ||
    selectedPlot?.id === `${type}-${index + 1}`

  // Wind speed affects crop animation
  const windMultiplier = 1 + (weatherData.windSpeed / 20)

  // Create instanced crop geometry for performance
  const cropGeometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.05, config.height, 4)
    return geo
  }, [config.height])

  // Animate crops
  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime

    // Wind animation - affected by weather
    if (meshRef.current.children) {
      meshRef.current.children.forEach((child, i) => {
        if (child.isInstancedMesh) {
          const dummy = new THREE.Object3D()
          const count = child.count

          for (let j = 0; j < Math.min(count, 100); j++) {
            dummy.position.set(
              (Math.random() - 0.5) * size[0],
              0,
              (Math.random() - 0.5) * size[1]
            )

            // Wind sway - stronger when windy or rainy
            let baseSway = 0.02
            if (weatherMode === 'rainy') baseSway = 0.01 // Rain makes plants droop
            if (weatherMode === 'windy') baseSway = 0.05

            const sway = Math.sin(time * 2 * windMultiplier + i * 0.1 + j * 0.05) * baseSway
            dummy.rotation.z = sway
            dummy.rotation.x = sway * 0.5

            // Droop effect when raining
            if (weatherMode === 'rainy' || weatherMode === 'stormy') {
              dummy.rotation.x += 0.1
            }

            dummy.updateMatrix()
            child.setMatrixAt(j, dummy.matrix)
          }
          child.instanceMatrix.needsUpdate = true
        }
      })
    }

    // Pulse effect for farm pulse mode
    if (farmPulseMode && meshRef.current.material) {
      const pulse = Math.sin(time * 3) * 0.1 + 0.9
      meshRef.current.material.emissiveIntensity = pulse * 0.3
    }
  })

  // Hover/selection effects
  const emissiveIntensity = useMemo(() => {
    if (isSelected) return 0.5
    if (isHovered) return 0.3
    return 0
  }, [isHovered, isSelected])

  // Get base color based on time of day
  const baseColor = useMemo(() => {
    const dayFactor = Math.sin((timeOfDay / 24) * Math.PI)
    return new THREE.Color(config.baseColor).lerp(
      new THREE.Color(config.matureColor),
      0.5 * dayFactor
    )
  }, [config, timeOfDay])

  return (
    <group ref={meshRef} position={position}>
      {/* Base terrain */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={size} />
        <meshStandardMaterial
          color={type === 'rice' ? '#3a4a5a' : '#4d3e2a'}
          roughness={0.9}
        />
      </mesh>

      {/* Crop instances */}
      {type !== 'greenhouse' && type !== 'orchard' && (
        <instancedMesh
          args={[cropGeometry, null, 150]}
          position={[0, 0, 0]}
          castShadow
        >
          <meshStandardMaterial
            color={baseColor}
            emissive={isSelected ? '#10b981' : isHovered ? '#22c55e' : '#000000'}
            emissiveIntensity={emissiveIntensity}
            roughness={0.7}
            metalness={0.1}
          />
        </instancedMesh>
      )}

      {/* Orchard trees */}
      {type === 'orchard' && (
        <group>
          {[...Array(5)].map((_, i) => (
            <group key={i} position={[(i % 3) * 2 - 2, 0, Math.floor(i / 3) * 2]}>
              {/* Tree trunk */}
              <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.15, 1, 8]} />
                <meshStandardMaterial color="#8b4513" roughness={0.9} />
              </mesh>
              {/* Tree canopy */}
              <mesh position={[0, 1.5, 0]} castShadow>
                <sphereGeometry args={[0.8, 8, 8]} />
                <meshStandardMaterial
                  color="#228b22"
                  emissive={isSelected ? '#10b981' : isHovered ? '#22c55e' : '#000000'}
                  emissiveIntensity={emissiveIntensity}
                  roughness={0.8}
                />
              </mesh>
              {/* Fruits */}
              {[...Array(3)].map((_, j) => (
                <mesh
                  key={j}
                  position={[
                    Math.cos(j * 2.1) * 0.5,
                    1.5 + Math.sin(j) * 0.3,
                    Math.sin(j * 2.1) * 0.5,
                  ]}
                >
                  <sphereGeometry args={[0.12, 8, 8]} />
                  <meshStandardMaterial
                    color="#ff6347"
                    roughness={0.5}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* Greenhouse */}
      {type === 'greenhouse' && (
        <group>
          {/* Glass structure */}
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[size[0], 2, size[1]]} />
            <meshStandardMaterial
              color="#add8e6"
              transparent
              opacity={0.3}
              metalness={0.9}
              roughness={0.1}
              emissive={isSelected ? '#10b981' : isHovered ? '#22c55e' : '#000000'}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          {/* Frame */}
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[size[0] + 0.1, 2.1, size[1] + 0.1]} />
            <meshStandardMaterial
              color="#333333"
              wireframe
            />
          </mesh>
          {/* Plants inside */}
          {[...Array(6)].map((_, i) => (
            <mesh
              key={i}
              position={[(i % 3) * 1.2 - 1.2, 0.2, Math.floor(i / 3) * 1.5 - 0.75]}
            >
              <boxGeometry args={[0.8, 0.4, 0.8]} />
              <meshStandardMaterial color="#32cd32" />
            </mesh>
          ))}
        </group>
      )}

      {/* Water for rice fields */}
      {type === 'rice' && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.005, 0]}
        >
          <planeGeometry args={size} />
          <meshStandardMaterial
            color="#4a7c9b"
            transparent
            opacity={0.7}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      )}

      {/* Selection/hover outline */}
      {(isHovered || isSelected) && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
        >
          <planeGeometry args={[size[0] + 0.2, size[1] + 0.2]} />
          <meshBasicMaterial
            color={isSelected ? '#10b981' : '#22c55e'}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  )
}

export default CropMesh