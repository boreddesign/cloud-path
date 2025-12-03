import { useMemo } from 'react'
import * as THREE from 'three'

function ProfilePreview({ profile, position }) {
  const shape = useMemo(() => {
    const shape = new THREE.Shape()
    if (profile && profile.length > 0) {
      shape.moveTo(profile[0][0], profile[0][1])
      for (let i = 1; i < profile.length; i++) {
        shape.lineTo(profile[i][0], profile[i][1])
      }
    }
    return shape
  }, [profile])

  const geometry = useMemo(() => {
    if (!shape) return null
    return new THREE.ShapeGeometry(shape)
  }, [shape])

  if (!geometry || !position) return null

  return (
    <mesh
      position={[position[0], position[1], position[2]]}
      rotation={[0, 0, 0]}
    >
      <primitive object={geometry} />
      <meshBasicMaterial
        color="#2191fb"
        side={THREE.DoubleSide}
        transparent
        opacity={0.5}
      />
    </mesh>
  )
}

export default ProfilePreview

