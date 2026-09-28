import { Canvas } from '@react-three/fiber';
import { useTierParams } from '../state/settings';
import { Backdrop } from './Backdrop';
import { Effects } from './Effects';
import { Lab } from './Lab';
import { LabCamera } from './LabCamera';
import { PerfProbe } from './PerfProbe';
import { QualityGovernor } from './QualityGovernor';
import { OVERVIEW } from './tables';

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
/** Debug switches for profiling: ?fx=0 disables post-processing, ?sky=0 the backdrop. */
const fxEnabled = params?.get('fx') !== '0';
const skyEnabled = params?.get('sky') !== '0';

export function CanvasRoot() {
  const { dpr } = useTierParams();
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 45, near: 0.1, far: 4000, position: [...OVERVIEW.camera] }}
      >
        <color attach="background" args={['#05060a']} />
        <QualityGovernor />
        <LabCamera />
        {skyEnabled && <Backdrop />}
        <Lab />
        {fxEnabled && <Effects />}
        <PerfProbe />
      </Canvas>
    </div>
  );
}
