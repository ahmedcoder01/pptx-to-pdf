import { ThemeFontScheme } from '../types/presentation';

/**
 * Resolve OOXML font references like +mj-lt and +mn-lt to concrete font families.
 */
export function resolveFont(
  fontFamily: string | undefined,
  fontScheme: ThemeFontScheme
): string {
  if (!fontFamily) return fontScheme.minorLatin;

  // OOXML uses special tokens for theme fonts
  switch (fontFamily) {
    case '+mj-lt': // Major Latin
    case '+mj-ea': // Major East Asian
    case '+mj-cs': // Major Complex Script
      return fontScheme.majorLatin;

    case '+mn-lt': // Minor Latin
    case '+mn-ea': // Minor East Asian
    case '+mn-cs': // Minor Complex Script
      return fontScheme.minorLatin;

    default:
      return fontFamily;
  }
}
