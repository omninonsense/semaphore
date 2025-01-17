import nodeResolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import copy from 'rollup-plugin-copy'
import { terser } from 'rollup-plugin-terser'

import pkg from './package.json'

export default [
  // CommonJS
  {
    input: 'src/index.js',
    output: { file: 'lib/semaphore.js', format: 'cjs', indent: false },
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      babel(),
      copy({
        targets: [
          {
            src: 'src/index.js',
            dest: 'lib/',
            rename: 'semaphore.js.flow'
          }
        ]
      })
    ]
  },

  // ES
  {
    input: 'src/index.js',
    output: { file: 'es/semaphore.js', format: 'es', indent: false },
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [babel()]
  },

  // ES for Browsers
  {
    input: 'src/index.js',
    output: { file: 'es/semaphore.mjs', format: 'es', indent: false },
    plugins: [
      nodeResolve(),
      babel(),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    ]
  },

  // UMD Development
  {
    input: 'src/index.js',
    output: {
      file: 'dist/semaphore.js',
      format: 'umd',
      name: 'Semaphore',
      indent: false
    },
    plugins: [
      nodeResolve(),
      babel({
        exclude: 'node_modules/**'
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('development')
      })
    ]
  },

  // UMD Production
  {
    input: 'src/index.js',
    output: {
      file: 'dist/semaphore.min.js',
      format: 'umd',
      name: 'Semaphore',
      indent: false
    },
    plugins: [
      nodeResolve(),
      babel({
        exclude: 'node_modules/**'
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    ]
  }
]
