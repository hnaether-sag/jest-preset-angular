import { jest } from '@jest/globals';
import { TsJestTransformer } from 'ts-jest/dist/ts-jest-transformer';

import { NgJestCompiler } from '../compiler/ng-jest-compiler';
import { NgJestTransformer } from '../ng-jest-transformer';

describe('NgJestTransformer', () => {
  describe('_configsFor', () => {
    test(
      'should return the same config set for same values with different jest config objects' +
        ' but their serialized versions are the same',
      () => {
        const obj1 = {
          config: { cwd: process.cwd(), extensionsToTreatAsEsm: [], globals: {}, testMatch: [], testRegex: [] },
          cacheFS: new Map(),
        };
        const obj2 = { ...obj1, config: { ...obj1.config, globals: {} } };
        // @ts-expect-error testing purpose
        const cs1 = new NgJestTransformer()._configsFor(obj1);
        // @ts-expect-error testing purpose
        const cs2 = new NgJestTransformer()._configsFor(obj2);

        expect(cs2).toBe(cs1);
      },
    );

    test('should return the same config set for same values with jest config objects', () => {
      const obj1 = {
        config: { cwd: process.cwd(), extensionsToTreatAsEsm: [], globals: {}, testMatch: [], testRegex: [] },
        cacheFS: new Map(),
      };
      const obj2 = { ...obj1 };
      // @ts-expect-error testing purpose
      const cs1 = new NgJestTransformer()._configsFor(obj1);
      // @ts-expect-error testing purpose
      const cs2 = new NgJestTransformer()._configsFor(obj2);

      expect(cs2).toBe(cs1);
    });
  });

  describe('getCacheKey', () => {
    test('should call getCacheKey method from parent class TsJestTransformer', () => {
      TsJestTransformer.prototype.getCacheKey = jest.fn();
      const input = {
        fileContent: 'export default "foo"',
        fileName: 'foo.ts',
        jestConfigStr: '{"foo": "bar"}',
        // eslint-disable-next-line
        options: { config: { foo: 'bar' } as any, instrument: false, rootDir: '/foo' },
      };
      const tr = new NgJestTransformer();
      // @ts-expect-error testing purpose
      tr.getCacheKey(input.fileContent, input.fileName, input.jestConfigStr, input.options);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(TsJestTransformer.prototype.getCacheKey).toHaveBeenCalledWith(
        input.fileContent,
        input.fileName,
        input.jestConfigStr,
        input.options,
      );
    });
  });

  describe('process', () => {
    const baseJestCfg = {
      cwd: './',
      testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
      testRegex: ['(/__tests__/.*|(\\\\.|/)(test|spec))\\\\.[jt]sx?$'],
      extensionsToTreatAsEsm: [],
    };

    beforeEach(() => {
      jest.spyOn(NgJestCompiler.prototype, 'getCompiledOutput').mockReturnValueOnce('');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test.each(['foo.ts', 'foo.js'])('should compile ts or js with allowJs by NgJestCompiler', (fileName) => {
      const jestCfg = {
        ...baseJestCfg,
        globals: { 'ts-jest': { tsconfig: { allowJs: true } } },
      };
      const input = {
        fileContent: 'const foo = 1',
        // eslint-disable-next-line
        options: { config: { ...jestCfg } as any, instrument: false, rootDir: '/foo', cacheFS: new Map(), },
      };
      const ngJestTransformer = new NgJestTransformer();

      // @ts-expect-error testing purpose
      ngJestTransformer.process(input.fileContent, fileName, input.options);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(NgJestCompiler.prototype.getCompiledOutput).toHaveBeenCalledWith(fileName, input.fileContent, undefined);
    });

    test.each([
      {
        fileName: 'foo.html',
        fileContent: '<h1>Hello world</h1>',
      },
      {
        fileName: 'foo.js',
        fileContent: 'const foo = 1',
      },
      {
        fileName: 'foo.d.ts',
        fileContent: 'type foo = number',
      },
    ])('should compile other files with ts-jest', ({ fileName, fileContent }) => {
      const jestCfg = {
        ...baseJestCfg,
        globals: {
          'ts-jest': {
            tsconfig: { allowJs: false },
            stringifyContentPathRegex: '\\.html$',
          },
        },
      };
      const input = {
        // eslint-disable-next-line
        options: { config: { ...jestCfg } as any, instrument: false, rootDir: '/foo', cacheFS: new Map(), },
      };
      const ngJestTransformer = new NgJestTransformer();

      // @ts-expect-error testing purpose
      ngJestTransformer.process(fileContent, fileName, input.options);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(NgJestCompiler.prototype.getCompiledOutput).not.toHaveBeenCalled();
    });
  });
});
