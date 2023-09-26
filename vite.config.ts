import {defineConfig} from "vite"
import {viteSingleFile} from "vite-plugin-singlefile"

export default defineConfig({
  plugins: [viteSingleFile()],
  esbuild: {
    jsxFactory: "h",
    jsxFragment: "Fragment",
  },
  publicDir: "assets"
})
