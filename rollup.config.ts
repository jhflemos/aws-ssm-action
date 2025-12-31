import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const config = {
  input: 'src/index.ts',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'cjs', // CommonJS is safest for Actions
    sourcemap: true
  },
  plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()],
  external: [
    '@actions/core',
    '@actions/github',
    '@aws-sdk/client-ssm' // ← exclude AWS SDK from bundle
  ]
}

export default config
