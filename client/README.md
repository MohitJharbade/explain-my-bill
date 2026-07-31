# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.



## Known limitation: image preprocessing on the live demo

The backend includes an image preprocessing step (auto-rotate, contrast
normalization, sharpening via `sharp`) that meaningfully improves OCR
accuracy on real, low-quality bill photos. This works reliably in local
development.

However, on Render's free tier, this native image-processing module
caused intermittent process crashes, likely due to container/environment
incompatibilities specific to that free-tier setup. To keep the live demo
stable and free, preprocessing is disabled in the deployed version — the
live app runs OCR directly on the uploaded image.

To see the full pipeline (including preprocessing), run the project
locally following the setup instructions below.