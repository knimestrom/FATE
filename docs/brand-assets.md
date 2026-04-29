# Brand Assets

Fate Market ships the project logo with the MVP repository so protocol code, frontend surfaces, docs, and package consumers can reference the same visual identity.

## Files

| File | Purpose |
| --- | --- |
| `assets/brand/fate-market-logo.png` | Primary Fate Market logo. |
| `assets/brand/fate-market-favicon.png` | Browser and app icon. |
| `public/logo.png` | Public static logo alias for web apps. |
| `public/favicon.png` | Public static favicon alias for web apps. |

## Code Reference

The brand metadata is exported from `src/core/brand.ts`:

```ts
import { fateMarketBrand } from "fate-market";

console.log(fateMarketBrand.assets.logo);
```

Use the bundled asset paths instead of creating one-off logo copies in downstream apps.
