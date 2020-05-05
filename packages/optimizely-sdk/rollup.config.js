/**
 * Copyright 2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'path';
import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from  'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import visualizer from 'rollup-plugin-visualizer';
import { dependencies } from './package.json';

const BUILD_ALL = process.env.BUILD_ALL ? true : false;
const BUILD_UMD_BUNDLE = process.env.BUILD_UMD_BUNDLE ? true : false;

const cjsBuildFor = (platform) => {
  return {
    plugins: [
      resolve(),
      commonjs(),
    ],
    external: ['https', 'http', 'url'].concat(Object.keys(dependencies || {})),
    input: `lib/index.${platform}.js`,
    output: {
      exports: 'named',
      format: 'cjs',
      file: `dist/optimizely.${platform}.min.js`,
      plugins: [ terser() ]
    }
  };
};

const esmBundle = {
  ...cjsBuildFor('browser'),
  output: {
    exports: 'named',
    format: 'es',
    file: 'dist/optimizely.browser.es.min.js',
    plugins: [ terser() ]
  }
}

const esmDevBundle = {
  ...esmBundle,
  output: {
    file: 'dist/optimizely.module.development.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    commonjs(),
    resolve({ browser: true }),
    visualizer({ filename: 'stats.development.html', sourcemap: true }),
  ]
}

const esmProdBundle = {
  ...esmBundle,
  output: {
    file: 'dist/optimizely.module.production.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    alias({ entries: [
      { find: './project_config_schema',
        replacement: path.resolve(__dirname, 'ext/project_config_schema.json') },
      { find: path.resolve(__dirname, 'lib/utils/config_validator/index.js'),
        replacement: path.resolve(__dirname, 'ext/config_validator.js') },
      { find: /.*\/enums$/,
        replacement: path.resolve(__dirname, 'ext/enums.js') }
    ]}),
    commonjs(),
    resolve({ browser: true }),
    visualizer({ filename: 'stats.production.html', sourcemap: true }),
  ]
}

const umdBundle = {
  plugins: [
    resolve({ browser: true }),
    commonjs({
      namedExports: {
        '@optimizely/js-sdk-logging': [
          'ConsoleLogHandler',
          'getLogger',
          'setLogLevel',
          'LogLevel',
          'setLogHandler',
          'setErrorHandler',
          'getErrorHandler'
        ],
        '@optimizely/js-sdk-event-processor': [
          'LogTierV1EventProcessor',
          'LocalStoragePendingEventsDispatcher'
        ]
      }
    }),
  ],
  input: 'lib/index.browser.js',
  output: [
    {
      name: 'optimizelySdk',
      format: 'umd',
      file: 'dist/optimizely.browser.umd.js',
      exports: 'named',
    },
    {
      name: 'optimizelySdk',
      format: 'umd',
      file: 'dist/optimizely.browser.umd.min.js',
      exports: 'named',
      plugins: [ terser() ],
    },
  ],
};

// A separate bundle for json schema validator.
const jsonSchemaBundle = {
  plugins: [
    resolve(),
    commonjs(),
  ],
  external: ['json-schema', '@optimizely/js-sdk-utils'],
  input: 'lib/utils/json_schema_validator/index.js',
  output: {
    exports: 'named',
    format: 'cjs',
    file: 'dist/optimizely.json_schema_validator.min.js',
    plugins: [ terser() ],
  }
};

const bundles = {
  'cjs-node': cjsBuildFor('node'),
  'cjs-browser': cjsBuildFor('browser'),
  'cjs-react-native': cjsBuildFor('react_native'),
  'esm': esmBundle,
  'esm-dev': esmDevBundle,
  'esm-prod': esmProdBundle,
  'json-schema': jsonSchemaBundle,
  'umd': umdBundle,
}

const bundlesMatching = key => Object.entries(bundles)
  .filter(([name, config]) => RegExp(key).test(name))
  .map(([_, config]) => config)

export default args => Object.keys(args)
  .filter(arg => arg.startsWith('config-'))
  .map(arg => arg.replace(/config-/, ''))
  .flatMap(bundlesMatching)
