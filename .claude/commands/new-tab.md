# /new-tab — Scaffold a new TubeLoad calculator tab

Add a new calculator tab to the TubeLoad app. The user will supply a tab name and load type; you do the rest.

## What to ask the user (if not already provided in $ARGUMENTS)

1. **Tab name** — e.g. "Three Loads", "Distributed Load"
2. **Load type** — which existing tab is closest: `simple`, `two-loads`, `cantilever`, or `boom`

Derive the file slug from the name (lowercase, hyphens): "Three Loads" → `three-loads`.

---

## Step 1 — Create the screen file

Create `app/(tabs)/<slug>.tsx` modelled on the closest existing tab:
- `simple`     → copy structure from `app/(tabs)/index.tsx`
- `two-loads`  → copy structure from `app/(tabs)/two-loads.tsx`
- `cantilever` → copy structure from `app/(tabs)/cantilever.tsx`
- `boom`       → copy structure from `app/(tabs)/boom.tsx`

Read the source file first, then adapt it:
- Rename the default export to `<PascalName>Screen`
- Update `AppHeader tabName="<Tab Name>"`
- Update the subtitle `Text` to match the new tab
- Stub out any new inputs or calculations with TODO comments
- Keep `{ isActive }: { isActive?: boolean }` prop and the `scrollRef` / `useEffect` scroll-to-top pattern
- Keep `maxWidth: 640, alignSelf: 'center', width: '100%'` on the `scroll` style

---

## Step 2 — Register in the layout

Edit `app/(tabs)/_layout.tsx`:

1. **Import** the new screen at the top with the other imports:
   ```ts
   import <PascalName>Screen from './<slug>';
   ```

2. **Add an icon function** at the bottom of the file, following the SVG style of the existing icons. Use `react-native-svg` (`Svg`, `Line`, `Polygon`, `Circle`). Keep viewBox `"0 0 22 20"`. Design a simple icon that hints at the load geometry.

3. **Add a TABS entry** before the `settings` entry (Settings always stays last):
   ```ts
   { key: '<slug>', title: '<Tab Name>', Icon: <PascalName>Icon, Screen: <PascalName>Screen as TabScreen },
   ```

---

## Step 3 — Engineering calculations (if needed)

If the new tab needs new math, create `src/engineering/calc-<slug>.ts` following the pattern of `src/engineering/calc-two-loads.ts`:
- Pure functions only, no React imports
- All inputs/outputs in SI units (mm, N, kg)
- Export a main `calcResults<PascalName>` function

---

## Step 4 — Checklist before finishing

- [ ] Screen file exports a default function named `<PascalName>Screen`
- [ ] `isActive` prop and scroll-to-top `useEffect` are present
- [ ] `maxWidth: 640` is on the scroll style
- [ ] Import added to `_layout.tsx`
- [ ] TABS entry added before Settings
- [ ] Icon function defined and referenced in TABS
- [ ] No TypeScript errors (run `npx tsc --noEmit` to verify)
