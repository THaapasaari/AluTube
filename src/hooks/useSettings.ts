import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { DEFAULT_MATERIAL_ID, MATERIALS, Material } from '../engineering/materials';

export type UnitSystem = 'metric' | 'imperial';

const KEY_UNITS = 'alutube_units';
const KEY_DF = 'alutube_df';
const KEY_MATERIAL = 'alutube_material';

export function useSettings() {
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

  const setUnits = async (u: UnitSystem) => {
    setUnitsState(u);
    await AsyncStorage.setItem(KEY_UNITS, u);
  };

  const setDf = async (n: number) => {
    setDfState(n);
    await AsyncStorage.setItem(KEY_DF, String(n));
  };

  const setMaterialId = async (id: string) => {
    if (!MATERIALS[id]) return;
    setMaterialIdState(id);
    await AsyncStorage.setItem(KEY_MATERIAL, id);
  };

  const material: Material = MATERIALS[materialId] ?? MATERIALS[DEFAULT_MATERIAL_ID];

  return { units, setUnits, df, setDf, material, materialId, setMaterialId, loaded };
}
