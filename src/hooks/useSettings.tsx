import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { DEFAULT_MATERIAL_ID, MATERIALS, Material } from '../engineering/materials';

export type UnitSystem = 'metric' | 'imperial';

const KEY_UNITS = 'alutube_units';
const KEY_DF = 'alutube_df';
const KEY_MATERIAL = 'alutube_material';

interface SettingsValue {
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
  df: number;
  setDf: (n: number) => void;
  material: Material;
  materialId: string;
  setMaterialId: (id: string) => void;
  loaded: boolean;
}

const Ctx = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnitsState] = useState<UnitSystem>('metric');
  const [df, setDfState] = useState<number>(3);
  const [materialId, setMaterialIdState] = useState<string>(DEFAULT_MATERIAL_ID);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [u, d, m] = await Promise.all([
        AsyncStorage.getItem(KEY_UNITS),
        AsyncStorage.getItem(KEY_DF),
        AsyncStorage.getItem(KEY_MATERIAL),
      ]);
      if (u === 'imperial') setUnitsState('imperial');
      if (d) {
        const n = parseFloat(d);
        if (Number.isFinite(n) && n > 0) setDfState(n);
      }
      if (m && MATERIALS[m]) setMaterialIdState(m);
      setLoaded(true);
    })();
  }, []);

  const value = useMemo<SettingsValue>(() => {
    const material: Material = MATERIALS[materialId] ?? MATERIALS[DEFAULT_MATERIAL_ID];
    return {
      units,
      df,
      material,
      materialId,
      loaded,
      setUnits: async (u) => {
        setUnitsState(u);
        await AsyncStorage.setItem(KEY_UNITS, u);
      },
      setDf: async (n) => {
        setDfState(n);
        await AsyncStorage.setItem(KEY_DF, String(n));
      },
      setMaterialId: async (id) => {
        if (!MATERIALS[id]) return;
        setMaterialIdState(id);
        await AsyncStorage.setItem(KEY_MATERIAL, id);
      },
    };
  }, [units, df, materialId, loaded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings must be used inside SettingsProvider');
  return v;
}
