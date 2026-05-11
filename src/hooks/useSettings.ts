import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export type UnitSystem = 'metric' | 'imperial';
export type DesignFactor = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const KEY_UNITS = 'alutube_units';
const KEY_DF = 'alutube_df';

export function useSettings() {
  const [units, setUnitsState] = useState<UnitSystem>('metric');
  const [df, setDfState] = useState<DesignFactor>(3);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [u, d] = await Promise.all([
        AsyncStorage.getItem(KEY_UNITS),
        AsyncStorage.getItem(KEY_DF),
      ]);
      if (u === 'imperial') setUnitsState('imperial');
      if (d) {
        const n = parseInt(d, 10);
        if (n >= 1 && n <= 7) setDfState(n as DesignFactor);
      }
      setLoaded(true);
    })();
  }, []);

  const setUnits = async (u: UnitSystem) => {
    setUnitsState(u);
    await AsyncStorage.setItem(KEY_UNITS, u);
  };

  const setDf = async (n: DesignFactor) => {
    setDfState(n);
    await AsyncStorage.setItem(KEY_DF, String(n));
  };

  return { units, setUnits, df, setDf, loaded };
}
