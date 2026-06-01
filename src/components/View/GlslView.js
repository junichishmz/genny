import React from 'react';
import { Canvas } from '@react-three/fiber';

import { WaterWallMesh } from '../glsl/WaterWall';

const GlslView = () => {

    return (
        <Canvas
            camera={{ position: [0, 0, 10] }}
            shadows
            gl={{ antialias: false }}
        >
            <ambientLight intensity={2.5} />
            {/* <directionalLight
        position={[1, 10, -2]}
        intensity={1}
        shadow-camera-far={70}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-mapSize={[512, 512]}
        castShadow
    /> */}

            <WaterWallMesh wave={4.7} smallWave={0.7} speed={2.7} />

            {/* <Line
      points={[lineData[0], lineData[1]]}
      color="white"
      lineWidth={3}
      dashed={false}
    />

    <mesh scale={0.15} rotation={[0.0,0.0, 0.0]} position={[posData1[0], posData1[1], 0]} >
    <circleGeometry args={[1.5,114,114]}/>
    <meshStandardMaterial color="#c30062" transparent opacity={1.0}/>
    <Text color="white" anchorX={0} anchorY={2} fontSize={3}>output</Text>
    </mesh>


    <mesh scale={0.15} rotation={[0.0,0.0, 0.0]} position={[posData2[0], posData2[1], 0]} >
    <circleGeometry args={[1.5,114,114]}/>
    <meshStandardMaterial color="#1040eb" transparent opacity={1.0}/>
    <Text color="white" anchorX={0} anchorY={2} fontSize={3}>input</Text>

    </mesh>
     */}
        </Canvas>
    );
};

export default GlslView;
