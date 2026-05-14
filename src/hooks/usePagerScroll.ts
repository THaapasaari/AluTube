import { createContext, useContext } from 'react';

export const PagerScrollContext = createContext<(enabled: boolean) => void>(() => {});
export const usePagerScroll = () => useContext(PagerScrollContext);
