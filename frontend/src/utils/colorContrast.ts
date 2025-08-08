/**
 * Color contrast validation utilities for WCAG 2.2 compliance
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 */
export const hexToRgb = (hex: string): RGB | null => {
  // Handle 6-digit hex colors
  const sixDigitResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (sixDigitResult) {
    return {
      r: parseInt(sixDigitResult[1], 16),
      g: parseInt(sixDigitResult[2], 16),
      b: parseInt(sixDigitResult[3], 16)
    };
  }
  
  // Handle 3-digit hex colors
  const threeDigitResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (threeDigitResult) {
    return {
      r: parseInt(threeDigitResult[1] + threeDigitResult[1], 16),
      g: parseInt(threeDigitResult[2] + threeDigitResult[2], 16),
      b: parseInt(threeDigitResult[3] + threeDigitResult[3], 16)
    };
  }
  
  return null;
};

/**
 * Calculate relative luminance of a color
 */
export const getRelativeLuminance = (rgb: RGB): number => {
  const { r, g, b } = rgb;
  
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

/**
 * Calculate contrast ratio between two colors
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Use hex colors (e.g., #ffffff)');
  }
  
  const luminance1 = getRelativeLuminance(rgb1);
  const luminance2 = getRelativeLuminance(rgb2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if color combination meets WCAG AA standards
 */
export const meetsWCAGAA = (foreground: string, background: string, isLargeText = false): boolean => {
  const contrastRatio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3 : 4.5;
  return contrastRatio >= requiredRatio;
};

/**
 * Check if color combination meets WCAG AAA standards
 */
export const meetsWCAGAAA = (foreground: string, background: string, isLargeText = false): boolean => {
  const contrastRatio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 4.5 : 7;
  return contrastRatio >= requiredRatio;
};

/**
 * Validate template color combinations
 */
export interface ColorCombination {
  foreground: string;
  background: string;
  element: string;
  isLargeText?: boolean;
}

export interface ColorValidationResult {
  isValid: boolean;
  contrastRatio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  element: string;
  recommendation?: string;
}

export const validateTemplateColors = (combinations: ColorCombination[]): ColorValidationResult[] => {
  return combinations.map(({ foreground, background, element, isLargeText = false }) => {
    try {
      const contrastRatio = getContrastRatio(foreground, background);
      const meetsAA = meetsWCAGAA(foreground, background, isLargeText);
      const meetsAAA = meetsWCAGAAA(foreground, background, isLargeText);
      
      let recommendation: string | undefined;
      if (!meetsAA) {
        const requiredRatio = isLargeText ? 3 : 4.5;
        recommendation = `Increase contrast ratio to at least ${requiredRatio}:1 for WCAG AA compliance`;
      }
      
      return {
        isValid: meetsAA,
        contrastRatio: Math.round(contrastRatio * 100) / 100,
        meetsAA,
        meetsAAA,
        element,
        recommendation
      };
    } catch (error) {
      return {
        isValid: false,
        contrastRatio: 0,
        meetsAA: false,
        meetsAAA: false,
        element,
        recommendation: `Invalid color format: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  });
};

/**
 * Extract colors from CSS styles for validation
 */
export const extractColorsFromCSS = (cssText: string): ColorCombination[] => {
  const combinations: ColorCombination[] = [];
  const colorRegex = /#([a-f\d]{6}|[a-f\d]{3})\b/gi;
  const colors = cssText.match(colorRegex) || [];
  
  // Simple extraction - in a real implementation, you'd parse CSS more thoroughly
  if (colors.length >= 2) {
    for (let i = 0; i < colors.length - 1; i += 2) {
      combinations.push({
        foreground: colors[i],
        background: colors[i + 1],
        element: `CSS rule ${Math.floor(i / 2) + 1}`
      });
    }
  }
  
  return combinations;
};