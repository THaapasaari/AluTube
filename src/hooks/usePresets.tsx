import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface TubePreset {
  id: string;
  name: string;
  d_o_mm: number; // stored in SI (mm) regardless of UI units
  t_mm: number;
}

const KEY = 'alutube_presets';

interface PresetsValue {
  presets: TubePreset[];
  add: (name: string, d_o_mm: number, t_mm: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  loaded: boolean;
}

const Ctx = createContext<PresetsValue | null>(null);

export function PresetsProvider({ children }: { children: React.ReactNode }) {
  const [presets, setPresets] = useState<TubePreset[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try { setPresets(JSON.parse(raw)); } catch { /* ignore corrupt */ }
      }
      setLoaded(true);
    });
  }, []);

  const add = useCallback(async (name: string, d_o_mm: number, t_mm: number) => {
    setPresets((prev) => {
      const next = [...prev, { id: String(Date.now()), name: name.trim(), d_o_mm, t_mm }];
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<PresetsValue>(
    () => ({ presets, add, remove, loaded }),
    [presets, add, remove, loaded]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePresets(): PresetsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePresets must be used inside PresetsProvider');
  return v;
}
