import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

const config = {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.cjs', // CommonJS for Node
    format: 'cjs',
    sourcemap: true,
    inlineDynamicImports: true
  },
  plugins: [
    typescript(),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    json()
  ],
  external: [] // bundle everything so Node finds dependencies
}

export default config
