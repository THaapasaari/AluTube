import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export type UnitSystem = 'metric' | 'imperial';

const KEY = 'alutube_units';

export function useSettings() {
  const [units, setUnitsState] = useState<UnitSystem>('metric');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((val) => {
      if (val === 'imperial') setUnitsState('imperial');
      setLoaded(true);
    });
  }, []);

  const setUnits = async (u: UnitSystem) => {
    setUnitsState(u);
    await AsyncStorage.setItem(KEY, u);
  };

  return { units, setUnits, loaded };
}
