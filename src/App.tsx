import { Canvas } from '@react-three/fiber';

export function App() {
  return (
    <div className="fixed inset-0">
      <Canvas data-testid="canvas" aria-hidden="true" gl={{ antialias: true }}>
        <color attach="background" args={['#05060a']} />
      </Canvas>
    </div>
  );
}
