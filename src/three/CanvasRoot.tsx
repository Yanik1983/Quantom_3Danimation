import { Canvas } from '@react-three/fiber';
import { useTierParams } from '../state/settings';
import { Backdrop } from './Backdrop';
import { CameraRig } from './CameraRig';
import { Effects } from './Effects';
import { PerfProbe } from './PerfProbe';
import { QualityGovernor } from './QualityGovernor';
import { SceneWindow } from './SceneWindow';
import { STATIONS } from './stations';

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
/** Debug switches for profiling: ?fx=0 disables post-processing, ?sky=0 the backdrop. */
const fxEnabled = params?.get('fx') !== '0';
const skyEnabled = params?.get('sky') !== '0';

const s0 = STATIONS[0];
const initialCamera: [number, number, number] = [
  s0.center[0] + s0.camera[0],
  s0.center[1] + s0.camera[1],
  s0.center[2] + s0.camera[2],
];

export function CanvasRoot() {
  const { dpr } = useTierParams();
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 45, near: 0.1, far: 4000, position: initialCamera }}
        style={{ touchAction: 'pan-y' }}
      >
        <color attach="background" args={['#05060a']} />
        <QualityGovernor />
        <CameraRig />
        {skyEnabled && <Backdrop />}
        <SceneWindow />
        {fxEnabled && <Effects />}
        <PerfProbe />
      </Canvas>
    </div>
  );
}
