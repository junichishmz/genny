import React from 'react'
import { Canvas } from '@react-three/fiber'
// import { OrthographicCamera,OrbitControls } from '@react-three/drei'
// import { Text } from '@react-three/drei'

import { WaterWallMesh } from '../glsl/WaterWall'

const GlslView = () => {
  return (
    <Canvas camera={{ position: [0, 0, 430]}}>
   

    <WaterWallMesh
              wave={4.7}
              smallWave={0.7}
              speed={0.7}/>

   

    {/* <Text color="white" anchorX={0} anchorY={10} fontSize={30}>Text test</Text> */}


        {/* <OrthographicCamera
                name="Personal Camera"
                makeDefault={true}
                zoom={3.0}
                far={100000}
                near={-100000}
                up={[0, 4, 0]}
                position={[300,200,-300]}
                rotation={[0.6, 3.14, -0.0]}
                // position={[3400.6, 2000.03, -1483.13]}
                // rotation={[-2.21, 0.98, 2.31]}
                />
            
        <OrbitControls 
                    enableRotate={true} 
                    minDistance={1} 
                    maxDistance={11.0} 
                    enableZoom={true}
                
                    enablePan={false}
                    autoRotateSpeed={15}/> */}

    </Canvas>
  )
}

export default GlslView