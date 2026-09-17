import { useEffect, useState, useSyncExternalStore } from 'react';
import { PythonRuntime, type PythonRuntimeOptions } from './pythonRuntime';

/** Creates a Python runtime for the lifetime of the component and starts loading it. */
export function usePythonRuntime(
  options: PythonRuntimeOptions,
  createRuntime: (options: PythonRuntimeOptions) => PythonRuntime = (o) => new PythonRuntime(o),
) {
  const [runtime] = useState(() => createRuntime(options));
  const state = useSyncExternalStore(runtime.subscribe, runtime.getState, runtime.getState);

  useEffect(() => {
    runtime.start();
    return () => runtime.stop();
  }, [runtime]);

  return { runtime, state };
}
