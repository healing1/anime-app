import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 768;
  const isPhone = !isTablet;
  const isLandscape = width > height;
  const gridColumns = isTablet ? (width >= 1200 ? 5 : (width >= 1024 ? 4 : 3)) : 2;
  const gridPadding = isTablet ? 24 : 16;
  const gridGap = isTablet ? 14 : 12;

  const cardWidth = (width - gridPadding * 2 - gridGap * (gridColumns - 1)) / gridColumns;
  const cardHeight = cardWidth * 1.42;
  const horizontalCardWidth = isTablet ? 150 : 130;
  const horizontalCardHeight = isTablet ? 210 : 182;
  const bannerHeight = isTablet ? (width * 0.35) : width * 0.53;
  const playerHeight = width * 9 / 16;
  const headerFontSize = isTablet ? 30 : 26;
  const sectionFontSize = isTablet ? 18 : 16;

  return {
    width, height, isTablet, isPhone, isLandscape,
    gridColumns, gridPadding, gridGap,
    cardWidth, cardHeight, horizontalCardWidth, horizontalCardHeight,
    bannerHeight, playerHeight,
    headerFontSize, sectionFontSize,
  };
}
