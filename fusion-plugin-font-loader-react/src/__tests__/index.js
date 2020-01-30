/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getFontConfig} from './fixtures/static/font-config';
import {
  fallbackLookup as expectedFallbackLookup,
  atomicFontFaces as expectedAtomicFontFaces,
  styledFontFaces as expectedStyledFontFaces,
  preloadLinks as expectedPreloadLinks,
} from './fixtures/expected';

import generateFallbackMap from '../generate-fallback-map';
import {
  generateAtomicFontFaces,
  generateStyledFontFaces,
} from '../generate-font-faces';
import type {AtomicFontsObjectType, StyledFontsObjectType} from '../types';
import generatePreloadLinks from '../generate-preload-links';

test('generateFallbackMap with atomic config', () => {
  const atomicFonts: AtomicFontsObjectType = (getFontConfig(false).fonts: any);
  expect(generateFallbackMap(atomicFonts, 0)).toEqual(
    expectedFallbackLookup.depth0
  );
  expect(generateFallbackMap(atomicFonts, 1)).toEqual(
    expectedFallbackLookup.depth1
  );
  expect(generateFallbackMap(atomicFonts, 2)).toEqual(
    expectedFallbackLookup.depth2
  );
});

test('generateAtomicFontFaces', () => {
  const atomicFonts: AtomicFontsObjectType = (getFontConfig(false).fonts: any);
  equalWithoutSpaces(
    generateAtomicFontFaces(atomicFonts),
    expectedAtomicFontFaces
  );
});

test('generateStyledFontFaces', () => {
  const styledFonts: StyledFontsObjectType = (getFontConfig(true).fonts: any);
  equalWithoutSpaces(
    generateStyledFontFaces(styledFonts),
    expectedStyledFontFaces
  );
});

test('generatePreloadLinks', () => {
  const atomicFonts: AtomicFontsObjectType = (getFontConfig(false).fonts: any);
  expect(generatePreloadLinks({'Lato-Regular': true}, atomicFonts)).toBe(
    expectedPreloadLinks
  );
});

function equalWithoutSpaces(str1, str2) {
  expect(str1.replace(/\s/g, '')).toBe(str2.replace(/\s/g, ''));
}
