import {
  hexToRgb,
  getRelativeLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  validateTemplateColors,
  extractColorsFromCSS,
  ColorCombination
} from '../colorContrast';

describe('Color Contrast Utilities', () => {
  describe('hexToRgb', () => {
    it('converts valid hex colors to RGB', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('ffffff')).toEqual({ r: 255, g: 255, b: 255 }); // Without #
    });

    it('handles 3-digit hex colors', () => {
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('returns null for invalid hex colors', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#gggggg')).toBeNull();
      expect(hexToRgb('#12345')).toBeNull();
    });
  });

  describe('getRelativeLuminance', () => {
    it('calculates correct luminance for white', () => {
      const white = { r: 255, g: 255, b: 255 };
      expect(getRelativeLuminance(white)).toBeCloseTo(1, 2);
    });

    it('calculates correct luminance for black', () => {
      const black = { r: 0, g: 0, b: 0 };
      expect(getRelativeLuminance(black)).toBeCloseTo(0, 2);
    });

    it('calculates correct luminance for gray', () => {
      const gray = { r: 128, g: 128, b: 128 };
      expect(getRelativeLuminance(gray)).toBeCloseTo(0.22, 2);
    });
  });

  describe('getContrastRatio', () => {
    it('calculates maximum contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('calculates minimum contrast ratio for identical colors', () => {
      const ratio = getContrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('calculates correct ratio for common color combinations', () => {
      // Blue text on white background
      const blueWhite = getContrastRatio('#0000ff', '#ffffff');
      expect(blueWhite).toBeGreaterThan(8);

      // Gray text on white background
      const grayWhite = getContrastRatio('#767676', '#ffffff');
      expect(grayWhite).toBeCloseTo(4.5, 1);
    });

    it('throws error for invalid colors', () => {
      expect(() => getContrastRatio('invalid', '#ffffff')).toThrow();
      expect(() => getContrastRatio('#ffffff', 'invalid')).toThrow();
    });
  });

  describe('meetsWCAGAA', () => {
    it('returns true for combinations that meet AA standards', () => {
      // Black on white - exceeds AA
      expect(meetsWCAGAA('#000000', '#ffffff')).toBe(true);
      
      // Dark gray on white - meets AA for normal text
      expect(meetsWCAGAA('#595959', '#ffffff')).toBe(true);
      
      // Light gray on white - meets AA for large text only
      expect(meetsWCAGAA('#767676', '#ffffff', true)).toBe(true);
    });

    it('returns false for combinations that do not meet AA standards', () => {
      // Light gray on white - fails AA for normal text
      expect(meetsWCAGAA('#999999', '#ffffff')).toBe(false);
      
      // Very light gray on white - fails AA for both normal and large text
      expect(meetsWCAGAA('#cccccc', '#ffffff')).toBe(false);
      expect(meetsWCAGAA('#cccccc', '#ffffff', true)).toBe(false);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('returns true for combinations that meet AAA standards', () => {
      // Black on white - exceeds AAA
      expect(meetsWCAGAAA('#000000', '#ffffff')).toBe(true);
      
      // Very dark gray on white - meets AAA for normal text
      expect(meetsWCAGAAA('#404040', '#ffffff')).toBe(true);
    });

    it('returns false for combinations that do not meet AAA standards', () => {
      // Medium gray on white - fails AAA for normal text
      expect(meetsWCAGAAA('#767676', '#ffffff')).toBe(false);
      
      // Light gray on white - fails AAA for both normal and large text
      expect(meetsWCAGAAA('#999999', '#ffffff')).toBe(false);
      expect(meetsWCAGAAA('#999999', '#ffffff', true)).toBe(false);
    });
  });

  describe('validateTemplateColors', () => {
    it('validates multiple color combinations', () => {
      const combinations: ColorCombination[] = [
        {
          foreground: '#000000',
          background: '#ffffff',
          element: 'Body text'
        },
        {
          foreground: '#767676',
          background: '#ffffff',
          element: 'Secondary text'
        },
        {
          foreground: '#cccccc',
          background: '#ffffff',
          element: 'Disabled text'
        }
      ];

      const results = validateTemplateColors(combinations);

      expect(results).toHaveLength(3);
      
      // Black on white should pass
      expect(results[0].isValid).toBe(true);
      expect(results[0].meetsAA).toBe(true);
      expect(results[0].meetsAAA).toBe(true);
      expect(results[0].recommendation).toBeUndefined();

      // Gray on white should pass AA but not AAA
      expect(results[1].isValid).toBe(true);
      expect(results[1].meetsAA).toBe(true);
      expect(results[1].meetsAAA).toBe(false);

      // Light gray on white should fail
      expect(results[2].isValid).toBe(false);
      expect(results[2].meetsAA).toBe(false);
      expect(results[2].recommendation).toContain('Increase contrast ratio');
    });

    it('handles large text correctly', () => {
      const combinations: ColorCombination[] = [
        {
          foreground: '#767676',
          background: '#ffffff',
          element: 'Large heading',
          isLargeText: true
        }
      ];

      const results = validateTemplateColors(combinations);
      
      // Should pass AA for large text
      expect(results[0].isValid).toBe(true);
      expect(results[0].meetsAA).toBe(true);
    });

    it('handles invalid colors gracefully', () => {
      const combinations: ColorCombination[] = [
        {
          foreground: 'invalid-color',
          background: '#ffffff',
          element: 'Invalid foreground'
        },
        {
          foreground: '#000000',
          background: 'invalid-color',
          element: 'Invalid background'
        }
      ];

      const results = validateTemplateColors(combinations);

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(false);
      expect(results[0].recommendation).toContain('Invalid color format');
      expect(results[1].isValid).toBe(false);
      expect(results[1].recommendation).toContain('Invalid color format');
    });
  });

  describe('extractColorsFromCSS', () => {
    it('extracts hex colors from CSS text', () => {
      const css = `
        .text { color: #000000; background-color: #ffffff; }
        .accent { color: #ff0000; background: #f0f0f0; }
      `;

      const combinations = extractColorsFromCSS(css);

      expect(combinations).toHaveLength(2);
      expect(combinations[0].foreground).toBe('#000000');
      expect(combinations[0].background).toBe('#ffffff');
      expect(combinations[1].foreground).toBe('#ff0000');
      expect(combinations[1].background).toBe('#f0f0f0');
    });

    it('handles 3-digit hex colors', () => {
      const css = '.short { color: #000; background: #fff; }';
      const combinations = extractColorsFromCSS(css);

      expect(combinations).toHaveLength(1);
      expect(combinations[0].foreground).toBe('#000');
      expect(combinations[0].background).toBe('#fff');
    });

    it('returns empty array for CSS without colors', () => {
      const css = '.no-colors { font-size: 16px; margin: 10px; }';
      const combinations = extractColorsFromCSS(css);

      expect(combinations).toHaveLength(0);
    });

    it('handles odd number of colors', () => {
      const css = '.single-color { color: #000000; }';
      const combinations = extractColorsFromCSS(css);

      expect(combinations).toHaveLength(0); // Need pairs of colors
    });
  });

  describe('Integration tests', () => {
    it('validates a complete template color scheme', () => {
      const templateColors: ColorCombination[] = [
        {
          foreground: '#000000', // Black
          background: '#ffffff', // White
          element: 'Body text'
        },
        {
          foreground: '#333333', // Dark gray
          background: '#ffffff', // White
          element: 'Secondary content'
        },
        {
          foreground: '#ffffff', // White
          background: '#0066cc', // Dark blue
          element: 'Primary button'
        },
        {
          foreground: '#000000', // Black
          background: '#f8f9fa', // Very light gray
          element: 'Card background'
        }
      ];

      const results = validateTemplateColors(templateColors);

      // All combinations should meet WCAG AA standards
      results.forEach((result, index) => {
        expect(result.isValid).toBe(true);
        expect(result.meetsAA).toBe(true);
        expect(result.contrastRatio).toBeGreaterThan(4.5);
      });
    });

    it('identifies problematic color combinations in a template', () => {
      const problematicColors: ColorCombination[] = [
        {
          foreground: '#cccccc', // Too light
          background: '#ffffff',
          element: 'Disabled text'
        },
        {
          foreground: '#ffff00', // Yellow
          background: '#ffffff', // White - poor contrast
          element: 'Warning text'
        }
      ];

      const results = validateTemplateColors(problematicColors);

      // Both should fail WCAG AA
      expect(results[0].isValid).toBe(false);
      expect(results[1].isValid).toBe(false);
      
      results.forEach(result => {
        expect(result.recommendation).toBeDefined();
        expect(result.recommendation).toContain('Increase contrast ratio');
      });
    });
  });
});