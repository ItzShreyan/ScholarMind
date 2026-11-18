/**
 * Type declarations for side-effect CSS imports.
 *
 * `next build` handles `.css` imports itself, but `tsc --noEmit` needs to be
 * told they exist — without this declaration every `import "…/x.css"` is a
 * type error even though the app builds and runs.
 */
declare module "*.css";
declare module "*.scss";
declare module "*.sass";
