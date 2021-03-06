import { normalize } from 'path';

import type { CompilerOptions } from '@angular/compiler-cli';
import type { Logger } from 'bs-logger';
import { LINE_FEED } from 'ts-jest/dist/constants';
import type { TTypeScript } from 'ts-jest/dist/types';
import type * as ts from 'typescript';

import type { NgJestConfig } from '../config/ng-jest-config';

export class NgJestCompilerHost implements ts.CompilerHost {
  private readonly _sourceFileCache: Map<string, ts.SourceFile> = new Map<string, ts.SourceFile>();
  private readonly _emittedResult: [string, string] = ['', ''];
  private readonly _ts: TTypeScript;
  private readonly _moduleResolutionCache: ts.ModuleResolutionCache;

  constructor(readonly logger: Logger, readonly ngJestCfg: NgJestConfig, readonly jestCacheFS: Map<string, string>) {
    this._ts = this.ngJestCfg.compilerModule;
    this._moduleResolutionCache = this._ts.createModuleResolutionCache(this.ngJestCfg.cwd, (x) => x);
  }

  getEmittedResult(): [string, string] {
    return this._emittedResult;
  }

  updateMemoryHost(fileName: string, fileContent: string): void {
    const previousContents = this.jestCacheFS.get(fileName);
    const contentsChanged = previousContents !== fileContent;
    if (contentsChanged) {
      this.jestCacheFS.set(fileName, fileContent);
    }
  }

  getSourceFile(fileName: string, languageVersion: ts.ScriptTarget): ts.SourceFile | undefined {
    const normalizedFileName = normalize(fileName);
    try {
      const cached = this._sourceFileCache.get(normalizedFileName);
      if (cached) {
        return cached;
      }

      this.logger.debug(
        { normalizedFileName },
        'getSourceFile: cache miss, reading file and create source file to update cache',
      );

      const content = this.readFile(normalizedFileName);
      if (content !== undefined) {
        const sf = this._ts.createSourceFile(normalizedFileName, content, languageVersion, true);
        this._sourceFileCache.set(fileName, sf);

        return sf;
      }
    } catch (e) {
      this.logger.error(e);
    }

    return undefined;
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return this._ts.createCompilerHost(options).getDefaultLibFileName(options);
  }

  // This is due to typescript CompilerHost interface being weird on writeFile. This shuts down
  // typings in WebStorm.
  get writeFile() {
    return (fileName: string, data: string, _writeByteOrderMark: boolean): void => {
      this._emittedResult[fileName.endsWith('.map') ? 1 : 0] = data;
    };
  }

  getCurrentDirectory(): string {
    return this.ngJestCfg.cwd;
  }

  getCanonicalFileName(fileName: string): string {
    return this.useCaseSensitiveFileNames() ? fileName : fileName.toLowerCase();
  }

  useCaseSensitiveFileNames(): boolean {
    return this._ts.sys.useCaseSensitiveFileNames;
  }

  getNewLine(): string {
    return LINE_FEED;
  }

  fileExists(fileName: string): boolean {
    return this._ts.sys.fileExists(fileName);
  }

  readFile(fileName: string): string | undefined {
    const normalizedFileName = normalize(fileName);
    let fileContent = this.jestCacheFS.get(normalizedFileName);

    this.logger.debug(
      { fileName: normalizedFileName },
      'readFile: file does not exist in memory cache, read file with file system',
    );

    if (!fileContent) {
      fileContent = this._ts.sys.readFile(normalizedFileName) ?? undefined;
      if (fileContent) {
        this.jestCacheFS.set(normalizedFileName, fileContent);
      }
    }

    return fileContent;
  }

  trace(message: string): void {
    this.logger.trace(message);
  }

  resolveModuleNames(
    moduleNames: string[],
    containingFile: string,
    _reusedNames: string[] | undefined,
    redirectedReference: ts.ResolvedProjectReference | undefined,
    options: CompilerOptions,
  ): Array<ts.ResolvedModule | undefined> {
    return moduleNames.map((moduleName) => {
      const { resolvedModule } = this._ts.resolveModuleName(
        moduleName,
        containingFile,
        options,
        this._ts.createCompilerHost(options),
        this._moduleResolutionCache,
        redirectedReference,
      );

      return resolvedModule;
    });
  }

  resolveTypeReferenceDirectives(
    typeReferenceDirectiveNames: string[],
    containingFile: string,
    redirectedReference: ts.ResolvedProjectReference | undefined,
    options: CompilerOptions,
  ): Array<ts.ResolvedTypeReferenceDirective | undefined> {
    return typeReferenceDirectiveNames.map((typeDirectiveName) => {
      const { resolvedTypeReferenceDirective } = this._ts.resolveTypeReferenceDirective(
        typeDirectiveName,
        containingFile,
        options,
        this._ts.createCompilerHost(options),
        redirectedReference,
      );

      return resolvedTypeReferenceDirective;
    });
  }
}
