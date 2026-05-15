# TubeLoad — Claude Code Notes

## What this app is
A structural calculator for film-set riggers. Computes deflection, bending moment, bending stress, and load capacity for aluminium and steel tubes across four loading configurations (simple, two loads, cantilever, boom). All math is verified against a reference Excel spreadsheet.

## Running the app
```
npx expo start        # start dev server — scan QR in Expo Go
npx tsc --noEmit      # type-check without building
```

## npm installs
Always use `--legacy-peer-deps` — there is a react-dom peer dependency conflict that causes plain `npm install` to fail:
```
npm install <package> --legacy-peer-deps
```
`npx expo install` works fine for Expo-managed packages.

## Tab navigation
Tabs use `react-native-pager-view` — **not** expo-router's `<Tabs>`. The custom tab bar and TABS registry live in `app/(tabs)/_layout.tsx`. To add a tab, use `/new-tab` or follow the checklist in `.claude/commands/new-tab.md`.

## Pager + diagram drag conflict
Any component that uses `PanResponder` for dragging **must** disable the pager on gesture start and re-enable on end, otherwise the pager steals the touch:
```ts
const setPagerScroll = usePagerScroll();
const setPagerScrollRef = useRef(setPagerScroll);
setPagerScrollRef.current = setPagerScroll;
// in onPanResponderGrant:  setPagerScrollRef.current(false)
// in onPanResponderRelease / onPanResponderTerminate: setPagerScrollRef.current(true)
```
Use the ref pattern (not direct call) because panResponder is memoised with `useMemo([])`.

## Screen boilerplate rules
Every tab screen must have:
- `{ isActive }: { isActive?: boolean }` prop
- `scrollRef` + `useEffect` scroll-to-top: `if (isActive) scrollRef.current?.scrollTo({ y: 0, animated: false })`
- `maxWidth: 640, alignSelf: 'center', width: '100%'` on the `scroll` contentContainerStyle (iPad support)

## Units
All internal calculations use SI units: **mm, N, kg**. Convert only at the display layer using helpers from `src/engineering/calculations.ts` (`mmToIn`, `kgToLbs`, etc.). Never pass imperial values into engineering functions.

## Settings
Settings (units, material, df, showReactions) are stored in `AsyncStorage` and exposed via `useSettings()` hook. The provider wraps the whole app in `app/_layout.tsx`. Add new persistent settings there — follow the existing pattern with a `KEY_*` constant and a state + AsyncStorage pair.

## Font
`Oswald_700Bold` is loaded in `app/_layout.tsx` via `useFonts`. Apply it with `fontFamily: 'Oswald_700Bold'` — used for the app name and tab name in the header.

## Support triangles in beam diagrams
Upward-pointing triangles (supports) use the CSS border trick:
```ts
borderLeftWidth: 7, borderRightWidth: 7,
borderBottomWidth: 10, borderBottomColor: color,
borderLeftColor: 'transparent', borderRightColor: 'transparent',
```
Do **not** use `transform: rotate` — it was tried and removed.
