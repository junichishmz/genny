import React, { useContext, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
// import { OrthographicCamera,OrbitControls } from '@react-three/drei'
import { Text, Line } from '@react-three/drei';

import { WaterWallMesh } from '../glsl/WaterWall';
import * as THREE from 'three';

import { ApiContext } from '../../contexts/ApiContext';

const GlslView = () => {
    const { similarityDis } = useContext(ApiContext);
    const [lineData, setLineData] = useState([]);

    const [posData1, setPosData1] = useState([2, 3]);
    const [posData2, setPosData2] = useState([-7, 0]);

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    useEffect(() => {
        var simDis = similarityDis;
        if (simDis > 12) simDis = 12;
        if (simDis < -12) simDis = -12;

        simDis = 12 - Math.abs(simDis);
        if (simDis < 1) simDis = 1; //min dis

        var p1X = getRandomInt(simDis, 0);
        var p2X = getRandomInt(-simDis, 0);

        var dx = p1X - p2X;
        var squrX = Math.sqrt(dx * dx);

        var yDis = Math.abs(simDis - squrX);

        var p1Y = (0 - yDis) / 2;
        var p2Y = (0 + yDis) / 2;
        setPosData1([p1X, p1Y]);
        setPosData2([p2X, p2Y]);
        let array = [
            [0, 0],
            [0, 0],
        ];

        setLineData(array);
    }, [similarityDis]);

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
