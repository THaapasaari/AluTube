import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

export interface TubePreset {
  id: string;
  name: string;
  d_o_mm: number; // stored in SI (mm) regardless of UI units
  t_mm: number;
}

const KEY = 'alutube_presets';

export function usePresets() {
  const [presets, setPresets] = useState<TubePreset[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try {
          setPresets(JSON.parse(raw));
        } catch {
          /* ignore corrupt */
        }
      }
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (next: TubePreset[]) => {
    setPresets(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const add = useCallback(
    async (name: string, d_o_mm: number, t_mm: number) => {
      const preset: TubePreset = {
        id: String(Date.now()),
        name: name.trim(),
        d_o_mm,
        t_mm,
      };
      await save([...presets, preset]);
    },
    [presets, save]
  );

  const remove = useCallback(
    async (id: string) => {
      await save(presets.filter((p) => p.id !== id));
    },
    [presets, save]
  );

  return { presets, add, remove, loaded };
}
