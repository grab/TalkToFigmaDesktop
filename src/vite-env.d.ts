/// <reference types="vite/client" />

// Vite compile-time environment variables
declare const __FIGMA_CLIENT_ID__: string;
declare const __FIGMA_CLIENT_SECRET__: string;
declare const __GOOGLE_ANALYTICS_ID__: string;
declare const __GOOGLE_ANALYTICS_API_SECRET__: string;

declare module '*.png' {
  const value: string
  export default value
}

declare module '*.jpg' {
  const value: string
  export default value
}

declare module '*.jpeg' {
  const value: string
  export default value
}

declare module '*.svg' {
  const value: string
  export default value
}

declare module '*.gif' {
  const value: string
  export default value
}
